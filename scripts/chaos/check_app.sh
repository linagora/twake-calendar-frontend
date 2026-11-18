#!/bin/bash
#
# Does the application answer? An account signs in through the SSO, then through the proxy: its profile (REST: the side
# service, MongoDB, the token cache in Redis), its calendars (DAV: esn-sabre and MongoDB), an event written then deleted
# (esn-sabre writes to MongoDB and publishes to RabbitMQ), a people search (OpenSearch). One line per step: its HTTP
# status and duration. Exit 1 when a step fails. Run on a started stack (start.sh).
#
set -uo pipefail
. "$(dirname "$0")/common.sh"
API="http://127.0.0.1:$CHAOS_API_PORT"
failed=0

step() {  # step <name> <expected status regex> <curl args...>: prints the status and the time taken
  local name="$1" expected="$2"; shift 2
  local out code time
  out="$(curl -s -o /dev/null -w '%{http_code} %{time_total}' --max-time 60 "$@")"
  code="${out% *}"; time="${out#* }"
  if [[ "$code" =~ ^($expected)$ ]]; then echo "ok    $name $code ${time}s"; else echo "FAIL  $name $code ${time}s"; failed=1; fi
}

start=$SECONDS
token="$(sso_token "$CHAOS_USER" "$CHAOS_PASSWORD")"
[ -n "$token" ] && echo "ok    sign-in (SSO) $((SECONDS - start))s" || { echo "FAIL  sign-in (SSO)"; exit 1; }
auth=(-H 'Host: api' -H "Authorization: Bearer $token")

user_id="$(curl -s --max-time 60 "${auth[@]}" "$API/api/user" | python3 -c 'import json,sys; print(json.load(sys.stdin)["_id"])' 2>/dev/null)"
[ -n "$user_id" ] && echo "ok    profile (GET /api/user)" || { echo "FAIL  profile (GET /api/user)"; exit 1; }

step "calendars (GET dav/calendars)" 200 "${auth[@]}" -H 'Accept: application/calendar+json' \
  "$API/dav/calendars/$user_id.json?personal=true&withRights=true"
uid="chaos-$(openssl rand -hex 8)"
start_date="$(date -u -d '+1 day' +%Y%m%dT100000Z)"; end_date="$(date -u -d '+1 day' +%Y%m%dT110000Z)"
ics="BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//twake-chaos//EN
BEGIN:VEVENT
UID:$uid
DTSTAMP:$(date -u +%Y%m%dT%H%M%SZ)
DTSTART:$start_date
DTEND:$end_date
SUMMARY:chaos probe $uid
END:VEVENT
END:VCALENDAR"
step "event written (PUT)" '201|204' "${auth[@]}" -X PUT -H 'Content-Type: text/calendar; charset=utf-8' \
  --data-binary "$ics" "$API/dav/calendars/$user_id/$user_id/$uid.ics"
step "event read (GET)" 200 "${auth[@]}" "$API/dav/calendars/$user_id/$user_id/$uid.ics"
step "people search (POST /api/people/search)" 200 "${auth[@]}" -X POST -H 'Content-Type: application/json' \
  -d '{"q":"bob","objectTypes":["user","contact"],"limit":5}' "$API/api/people/search"
step "event deleted (DELETE)" '204|200' "${auth[@]}" -X DELETE "$API/dav/calendars/$user_id/$user_id/$uid.ics"
exit $failed
