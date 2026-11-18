#!/bin/bash
# A native CalDAV client (Thunderbird, DAVx5: the "CalDAV link" the web app shows, DAV_BASE_URL) syncs with the user's
# login and password (Basic authentication to esn-sabre, checked against the LDAP): it discovers its principal, then its
# calendar home, then lists its calendars. Host: dav, esn-sabre directly.
. "$(dirname "$0")/lib.sh"

dav() {  # dav <path> <depth> <propfind body>: the body, then the status
  curl -s --max-time "$HTTP_TIMEOUT" -u "$CHAOS_USER:$CHAOS_PASSWORD" -H "Host: $CHAOS_DAV_HOST" -X PROPFIND \
    -H "Depth: $2" -H 'Content-Type: application/xml; charset=utf-8' --data "$3" -w '\n%{http_code}' "$API$1"
}
href_in() {  # href_in <element>: the href inside the element
  python3 -c '
import re, sys
m = re.search(r"<[^>]*" + sys.argv[1] + r"[^>]*>\s*<d:href>([^<]+)</d:href>", sys.stdin.read())
print(m.group(1) if m else "")' "$1"
}

out="$(dav / 0 '<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>')"
[ "$(status_of "$out")" = 207 ] || fail "CalDAV with Basic authentication refused (PROPFIND /: HTTP $(status_of "$out"))"
principal="$(body_of "$out" | href_in current-user-principal)"
[ -n "$principal" ] || fail "CalDAV: no principal for $CHAOS_USER"

out="$(dav "$principal" 0 '<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>')"
[ "$(status_of "$out")" = 207 ] || fail "CalDAV: principal not served (PROPFIND: HTTP $(status_of "$out"))"
home="$(body_of "$out" | href_in calendar-home-set)"
[ -n "$home" ] || fail "CalDAV: no calendar home"

out="$(dav "$home" 1 '<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:displayname/></d:prop></d:propfind>')"
[ "$(status_of "$out")" = 207 ] || fail "CalDAV: calendar home not listed (PROPFIND: HTTP $(status_of "$out"))"
grep -q 'calendar/>' <<<"$(body_of "$out")" || grep -q ':calendar/>' <<<"$(body_of "$out")" || fail "CalDAV: no calendar in the home"
pass "a CalDAV client signs in with Basic authentication and lists its calendars"
