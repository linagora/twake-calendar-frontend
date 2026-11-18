# Shared by the control scripts of Twake Calendar (sourced, never run). Each script: `. "$(dirname "$0")/lib.sh"`.
#
# Exit codes: pass (0) the feature works, fail (1) it does not, broken (2) the probe could not set itself up. The last
# line printed says why.

set -uo pipefail
CONTROL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$CONTROL_DIR/../common.sh"
if [ ! -r "$CHAOS_RUN/env" ]; then echo "no $CHAOS_RUN/env: start.sh has not run"; exit 2; fi
. "$CHAOS_RUN/env"

pass()   { echo "${1:-ok}"; exit 0; }
fail()   { echo "${1:-failed}"; exit 1; }
broken() { echo "${1:-probe broken}"; exit 2; }

# a short random token, to name what a run creates
rand() { openssl rand -hex 6; }

# per request timeout: a hung backend fails the request, not the script's whole budget
HTTP_TIMEOUT="${HTTP_TIMEOUT:-15}"

# ------------------------------------------------------------------------------------------------- signing in
# A signed-in user's session: the SSO access token the web app holds after its sign-in. Obtained with the password grant
# (Dex authenticates against the LDAP), then kept for the next runs, as a browser keeps it: the features of a signed-in
# user are checked with it, and keep being checked while a new sign-in is impossible (the LDAP down). The sign-in itself
# is the feature sso_sign_in, which never uses this cache. Dex keeps its signing keys in memory: the cache is keyed by its
# container's start time, a restarted Dex invalidates it.
TOKEN_CACHE_DIR="$CHAOS_RUN/control-tokens"

sso_started_at() {
  docker inspect -f '{{.State.StartedAt}}' "$CHAOS_PROJECT-sso-1" 2>/dev/null | tr -c 'A-Za-z0-9\n' '_'
}

jwt_exp() {  # jwt_exp <token>: its expiry (epoch seconds), 0 when unreadable
  python3 - "$1" <<'EOF' 2>/dev/null || echo 0
import base64, json, sys
p = sys.argv[1].split(".")[1]
print(int(json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))["exp"]))
EOF
}

# session_token <email>: prints a valid access token of the account (cached, or a new sign-in); returns 1 when none
session_token() {
  local email="$1" key file token exp
  key="$(sso_started_at)"
  file="$TOKEN_CACHE_DIR/${email}.${key:-unknown}"
  if [ -s "$file" ]; then
    token="$(cat "$file")"
    exp="$(jwt_exp "$token")"
    # valid for 10 more minutes at least: a probe never starts with a token about to expire
    if [ "$exp" -gt $(( $(date +%s) + 600 )) ]; then echo "$token"; return 0; fi
  fi
  token="$(sso_token "$email" "$CHAOS_PASSWORD" 2>/dev/null)"
  [ -n "$token" ] || return 1
  mkdir -p "$TOKEN_CACHE_DIR" && chmod 700 "$TOKEN_CACHE_DIR"
  find "$TOKEN_CACHE_DIR" -name "${email}.*" ! -name "${email}.${key:-unknown}" -delete 2>/dev/null
  printf '%s' "$token" > "$file.tmp" && mv "$file.tmp" "$file"
  echo "$token"
}

# ------------------------------------------------------------------------------------------------- the REST / DAV API
# The web app's way in: the proxy, Host: api (the side service: its REST API, and esn-sabre under /dav/, OIDC wrapped)
API="$CHAOS_API_URL"

# api <token> <curl args...>: a request to the REST API as the web app sends it; the body on stdout, then a last line
# with the HTTP status (000: no answer)
api() {
  local token="$1"; shift
  curl -s --max-time "$HTTP_TIMEOUT" -H "Host: $CHAOS_API_HOST" -H "Authorization: Bearer $token" -w '\n%{http_code}' "$@"
}

# split the output of api: body / status
status_of() { tail -n 1 <<<"$1"; }
body_of() { sed '$d' <<<"$1"; }

# signed_in <email> <var prefix>: sets <prefix>_TOKEN and <prefix>_ID (the user's id: GET /api/user, as the web app does
# on load) or exits: 2 no session can be had, 1 the profile is not served
signed_in() {
  local email="$1" prefix="$2" token out id
  token="$(session_token "$email")" || broken "no session for $email: the SSO sign-in fails and no token is cached"
  out="$(api "$token" "$API/api/user")"
  [ "$(status_of "$out")" = 200 ] || fail "profile of $email not served (GET /api/user: HTTP $(status_of "$out"))"
  id="$(body_of "$out" | jq -r '._id // empty' 2>/dev/null)"
  [ -n "$id" ] || fail "profile of $email without an id (GET /api/user)"
  printf -v "${prefix}_TOKEN" '%s' "$token"
  printf -v "${prefix}_ID" '%s' "$id"
}

# an ICS event: ics_event <uid> <summary> <start, UTC basic format> <end> [extra VEVENT lines]
ics_event() {
  printf 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//twake-chaos//control//EN\r\nBEGIN:VEVENT\r\nUID:%s\r\nDTSTAMP:%s\r\nDTSTART:%s\r\nDTEND:%s\r\nSUMMARY:%s\r\n%sEND:VEVENT\r\nEND:VCALENDAR\r\n' \
    "$1" "$(date -u +%Y%m%dT%H%M%SZ)" "$3" "$4" "$2" "${5:-}"
}

# event_url <user id> <uid>: the event in the user's default calendar (its id is the user's)
event_url() { echo "$API/dav/calendars/$1/$1/$2.ics"; }

# put_event <token> <url> <ics>: prints the HTTP status
put_event() {
  curl -s -o /dev/null -w '%{http_code}' --max-time "$HTTP_TIMEOUT" -H "Host: $CHAOS_API_HOST" -H "Authorization: Bearer $1" \
    -X PUT -H 'Content-Type: text/calendar; charset=utf-8' --data-binary "$3" "$2"
}

# delete_quietly <token> <url>: cleaning, best effort
delete_quietly() {
  curl -s -o /dev/null --max-time "$HTTP_TIMEOUT" -H "Host: $CHAOS_API_HOST" -H "Authorization: Bearer $1" -X DELETE "$2" || true
}

# delete_matching <token> <user id> <day: YYYYMMDD> <text>: cleaning, best effort: deletes the events of the user's
# default calendar on that day whose content contains the text (an attendee's copy of an invitation, a cancelled booking)
delete_matching() {
  local href
  for href in $(curl -s --max-time "$HTTP_TIMEOUT" -H "Host: $CHAOS_API_HOST" -H "Authorization: Bearer $1" -X REPORT \
      -H 'Accept: application/json' -d "{\"match\":{\"start\":\"${3}T000000\",\"end\":\"${3}T235959\"}}" \
      "$API/dav/calendars/$2/$2.json" 2>/dev/null \
      | jq -r --arg t "$4" '._embedded["dav:item"][]? | select(tostring | contains($t)) | ._links.self.href' 2>/dev/null); do
    delete_quietly "$1" "$API/dav$href"
  done
}

# ------------------------------------------------------------------------------------------------- polling
# poll <seconds> <interval> <command...>: runs the command until it succeeds; returns 1 at the deadline
poll() {
  local timeout="$1" interval="$2"; shift 2
  local deadline=$((SECONDS + timeout))
  while :; do
    "$@" && return 0
    [ $SECONDS -ge $deadline ] && return 1
    sleep "$interval"
  done
}

# the async features' wait: their timeout in features.yaml minus a margin for their setup
ASYNC_WAIT="${ASYNC_WAIT:-45}"

# ------------------------------------------------------------------------------------------------- the mail catcher
# mail_to <recipient> <text>: a mail caught for the recipient whose content contains the text
mail_to() {
  curl -s --max-time "$HTTP_TIMEOUT" "$CHAOS_SMTP_API_URL/smtpMails" | python3 -c '
import json, sys
rcpt, text = sys.argv[1].lower(), sys.argv[2]
mails = json.load(sys.stdin)
for m in mails:
    rcpts = [r.get("address", "").lower() for r in m.get("recipients", [])]
    if rcpt in rcpts and text in json.dumps(m):
        sys.exit(0)
sys.exit(1)' "$1" "$2" 2>/dev/null
}
