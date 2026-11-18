#!/bin/bash
# Booking links: a signed-in user publishes a booking link on their calendar (POST /api/booking-links, open one day); a
# visitor of the public page, not signed in, sees its free slots (GET .../slots), books one (POST .../book), sees the
# booked event (GET /api/booked-event) and cancels it (DELETE /api/booked-event). The link is deleted at the end.
. "$(dirname "$0")/lib.sh"

signed_in "$CHAOS_USER" U
day="$(date -u -d "+$((RANDOM % 25 + 30)) day" +%Y-%m-%d)"
next="$(date -u -d "$day +1 day" +%Y-%m-%d)"
tok="$(rand)"
public() {  # the public SPA's calls: no authentication
  curl -s --max-time "$HTTP_TIMEOUT" -H "Host: $CHAOS_API_HOST" -w '\n%{http_code}' "$@"
}

link="$(jq -cn --arg c "/calendars/$U_ID/$U_ID" --arg n "chaos $tok" --arg s "${day}T08:00:00" --arg e "${day}T17:00:00" \
  '{calendarUrl: $c, durationMinutes: 30, active: true, autoAccept: true, name: $n,
    availabilityRules: [{type: "fixed", start: $s, end: $e, timeZone: "UTC"}]}')"
out="$(api "$U_TOKEN" -X POST -H 'Content-Type: application/json' -d "$link" "$API/api/booking-links")"
[ "$(status_of "$out")" = 201 ] || fail "booking link not created (POST: HTTP $(status_of "$out"))"
id="$(body_of "$out" | jq -r '.bookingLinkPublicId // empty' 2>/dev/null)"
[ -n "$id" ] || fail "booking link created without a public id"
confirmation=""
cleanup() {
  [ -n "$confirmation" ] && public -o /dev/null -X DELETE "$API/api/booked-event?bookingConfirmationToken=$confirmation" >/dev/null
  api "$U_TOKEN" -o /dev/null -X DELETE "$API/api/booking-links/$id" >/dev/null
  # the cancelled booking stays in the owner's calendar, marked cancelled
  delete_matching "$U_TOKEN" "$U_ID" "${day//-/}" "chaos booking $tok"
}
trap cleanup EXIT

out="$(public "$API/api/booking-links/$id/slots?from=${day}T00:00:00Z&to=${next}T00:00:00Z&timeZone=UTC")"
[ "$(status_of "$out")" = 200 ] || fail "the booking page's slots are not served (HTTP $(status_of "$out"))"
slot="$(body_of "$out" | jq -r '[.slots[].start] | .[length * (now % 1) | floor]' 2>/dev/null)"
[ -n "$slot" ] && [ "$slot" != null ] || fail "the booking page offers no free slot on $day"
start_utc="$(date -u -d "$slot" +%Y-%m-%dT%H:%M:%SZ)"

booking="$(jq -cn --arg s "$start_utc" --arg e "chaos-booker-$tok@example.org" --arg t "chaos booking $tok" \
  '{startUtc: $s, creator: {name: "Chaos Booker", email: $e}, eventTitle: $t, visioLink: false}')"
out="$(public -X POST -H 'Content-Type: application/json' -d "$booking" "$API/api/booking-links/$id/book")"
[ "$(status_of "$out")" = 201 ] || fail "the slot $start_utc is not booked (POST book: HTTP $(status_of "$out"))"
confirmation="$(body_of "$out" | jq -r '.bookingConfirmationToken // empty' 2>/dev/null)"
[ -n "$confirmation" ] || fail "booking without a confirmation token"

out="$(public "$API/api/booked-event?bookingConfirmationToken=$confirmation")"
[ "$(status_of "$out")" = 200 ] && grep -q "chaos booking $tok" <<<"$(body_of "$out")" \
  || fail "the booked event is not served to the visitor (HTTP $(status_of "$out"))"
out="$(public -X DELETE "$API/api/booked-event?bookingConfirmationToken=$confirmation")"
code="$(status_of "$out")"
[ "$code" = 204 ] || [ "$code" = 200 ] || fail "the booking is not cancelled (DELETE: HTTP $code)"
confirmation=""
pass "booking link published, a slot booked, seen and cancelled by the visitor"
