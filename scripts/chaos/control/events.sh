#!/bin/bash
# A signed-in user manages an event of their own calendar: creates it (PUT), sees it in the calendar's view of that day
# (REPORT on a time range, as the week view loads), opens it, renames it, then deletes it and it is gone.
. "$(dirname "$0")/lib.sh"

signed_in "$CHAOS_USER" U
uid="chaos-event-$(rand)"
day="$(date -u -d "+$((RANDOM % 20 + 5)) day" +%Y%m%d)"
url="$(event_url "$U_ID" "$uid")"
trap 'delete_quietly "$U_TOKEN" "$url"' EXIT

code="$(put_event "$U_TOKEN" "$url" "$(ics_event "$uid" "chaos $uid" "${day}T090000Z" "${day}T100000Z")")"
[ "$code" = 201 ] || fail "event not created (PUT: HTTP $code)"

out="$(api "$U_TOKEN" -X REPORT -H 'Accept: application/json, text/plain, */*' \
  -d "{\"match\":{\"start\":\"${day}T000000\",\"end\":\"${day}T235959\"}}" "$API/dav/calendars/$U_ID/$U_ID.json")"
[ "$(status_of "$out")" = 200 ] || fail "the calendar's view of the day is not served (REPORT: HTTP $(status_of "$out"))"
grep -q "$uid" <<<"$(body_of "$out")" || fail "the created event is not in the calendar's view of its day"

out="$(api "$U_TOKEN" -H 'Accept: application/calendar+json' "$url")"
[ "$(status_of "$out")" = 200 ] || fail "event not opened (GET: HTTP $(status_of "$out"))"

code="$(put_event "$U_TOKEN" "$url" "$(ics_event "$uid" "renamed $uid" "${day}T090000Z" "${day}T100000Z")")"
[ "$code" = 204 ] || [ "$code" = 201 ] || fail "event not updated (PUT: HTTP $code)"
out="$(api "$U_TOKEN" -H 'Accept: application/calendar+json' "$url")"
grep -q "renamed $uid" <<<"$(body_of "$out")" || fail "the update of the event is not read back"

code="$(api "$U_TOKEN" -X DELETE "$url" | tail -n 1)"
[ "$code" = 204 ] || fail "event not deleted (DELETE: HTTP $code)"
code="$(api "$U_TOKEN" "$url" | tail -n 1)"
[ "$code" = 404 ] || fail "the deleted event is still served (GET: HTTP $code)"
trap - EXIT
pass "event created, seen in its day, opened, renamed, deleted"
