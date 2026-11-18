"""The realtime probe of realtime.sh (standard library only): a WebSocket client of the side service, as the web app's.

realtime.py <api url> <api host> <token> <user id> <event url> <ics> <wait seconds>

Gets a ticket (POST /ws/ticket), opens GET /ws?ticket=..., registers the user's default calendar, then writes an event to
it (PUT through the DAV proxy) and waits for the push of that calendar's new sync token. Deletes the event. Prints one
line, exits 0 (pushed), 1 (not pushed, or the WebSocket refused), 2 (the event could not be written: not this feature).
"""
import base64
import json
import os
import socket
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

api, host, token, user_id, event_url, ics, wait = sys.argv[1:8]
wait = float(wait)
calendar = "/calendars/%s/%s" % (user_id, user_id)


def out(code, msg):
    print(msg)
    sys.exit(code)


def http(method, url, body=None, headers=None):
    h = {"Host": host, "Authorization": "Bearer " + token}
    h.update(headers or {})
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:  # no answer
        return 0, str(e).encode()


status, body = http("POST", api + "/ws/ticket")
if status != 200:
    out(1, "no WebSocket ticket (POST /ws/ticket: HTTP %d)" % status)
ticket = json.loads(body)["value"]

u = urllib.parse.urlsplit(api)
sock = socket.create_connection((u.hostname, u.port or 80), timeout=10)
key = base64.b64encode(os.urandom(16)).decode()
sock.sendall(("GET /ws?ticket=%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
              "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (ticket, host, key)).encode())
buf = b""
while b"\r\n\r\n" not in buf:
    chunk = sock.recv(4096)
    if not chunk:
        out(1, "the WebSocket closed during its handshake")
    buf += chunk
head, buf = buf.split(b"\r\n\r\n", 1)
if b" 101 " not in head.split(b"\r\n")[0]:
    out(1, "WebSocket refused: %s" % head.split(b"\r\n")[0].decode(errors="replace"))


def send(opcode, payload):
    mask = os.urandom(4)
    n = len(payload)
    if n < 126:
        header = struct.pack("!BB", 0x80 | opcode, 0x80 | n)
    elif n < 65536:
        header = struct.pack("!BBH", 0x80 | opcode, 0x80 | 126, n)
    else:
        header = struct.pack("!BBQ", 0x80 | opcode, 0x80 | 127, n)
    sock.sendall(header + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))


def read_exact(n):
    global buf
    while len(buf) < n:
        chunk = sock.recv(65536)
        if not chunk:
            raise EOFError
        buf += chunk
    data, buf = buf[:n], buf[n:]
    return data


def messages(deadline):
    """The JSON text messages received until the deadline (pings answered)."""
    fragments = b""
    while True:
        left = deadline - time.time()
        if left <= 0:
            return
        sock.settimeout(left)
        try:
            b1, b2 = read_exact(2)
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack("!H", read_exact(2))[0]
            elif n == 127:
                n = struct.unpack("!Q", read_exact(8))[0]
            if b2 & 0x80:
                m = read_exact(4)
                payload = bytes(b ^ m[i % 4] for i, b in enumerate(read_exact(n)))
            else:
                payload = read_exact(n)
        except socket.timeout:
            return
        opcode = b1 & 0x0F
        if opcode == 0x9:
            send(0xA, payload)
        elif opcode == 0x8:
            raise EOFError
        elif opcode in (0x1, 0x0):
            fragments += payload
            if b1 & 0x80:
                try:
                    yield json.loads(fragments)
                except ValueError:
                    pass
                fragments = b""


try:
    send(0x1, json.dumps({"register": [calendar]}).encode())
    registered = False
    for msg in messages(time.time() + 10):
        if calendar in (msg.get("registered") or []):
            registered = True
            break
        if calendar in (msg.get("notRegistered") or {}):
            out(1, "the calendar is not registered for pushes: %s" % msg["notRegistered"][calendar])
    if not registered:
        out(1, "no answer to the WebSocket registration of the calendar")

    status, body = http("PUT", event_url, ics.encode(), {"Content-Type": "text/calendar; charset=utf-8"})
    if status != 201:
        out(2, "event not written (PUT: HTTP %d): the push cannot be checked" % status)
    try:
        started = time.time()
        for msg in messages(started + wait):
            if isinstance(msg.get(calendar), dict) and msg[calendar].get("syncToken"):
                out(0, "the calendar change was pushed over the WebSocket in %.1fs" % (time.time() - started))
        out(1, "no push of the calendar change over the WebSocket after %ds" % wait)
    finally:
        http("DELETE", event_url)
except EOFError:
    out(1, "the WebSocket was closed by the server")
