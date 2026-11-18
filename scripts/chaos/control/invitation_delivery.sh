#!/bin/bash
# A signed-in user invites another user to an event: the event appears in the attendee's calendar, for them to answer
# (the iTIP request delivered locally: esn-sabre publishes it on RabbitMQ, the side service delivers it). The attendee's
# own session sees it in their calendar's view of that day.
# Asynchronous: polls the attendee's calendar until the event is there or the wait is over.
. "$(dirname "$0")/lib.sh"

signed_in "$CHAOS_USER" U
signed_in "$CHAOS_USER2" A
uid="chaos-invite-delivery-$(rand)"
day="$(date -u -d "+$((RANDOM % 20 + 5)) day" +%Y%m%d)"
url="$(event_url "$U_ID" "$uid")"
# cleaning: the organizer's event, then the attendee's copy (the cancellation only marks it cancelled)
trap 'delete_quietly "$U_TOKEN" "$url"; delete_matching "$A_TOKEN" "$A_ID" "$day" "$uid"' EXIT
attendees="ORGANIZER:mailto:$CHAOS_USER"$'\r\n'"ATTENDEE;PARTSTAT=ACCEPTED;ROLE=CHAIR:mailto:$CHAOS_USER"$'\r\n'"ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:$CHAOS_USER2"$'\r\n'
code="$(put_event "$U_TOKEN" "$url" "$(ics_event "$uid" "chaos $uid" "${day}T070000Z" "${day}T080000Z" "$attendees")")"
[ "$code" = 201 ] || fail "event with an attendee not created (PUT: HTTP $code)"

last=""
delivered() {
  local out
  out="$(api "$A_TOKEN" -X REPORT -H 'Accept: application/json, text/plain, */*' \
    -d "{\"match\":{\"start\":\"${day}T000000\",\"end\":\"${day}T235959\"}}" "$API/dav/calendars/$A_ID/$A_ID.json")"
  last="$(status_of "$out")"
  [ "$last" = 200 ] && grep -q "$uid" <<<"$(body_of "$out")"
}
poll "$ASYNC_WAIT" 1 delivered || fail "the invitation is not in $CHAOS_USER2's calendar after ${ASYNC_WAIT}s (last view: HTTP $last)"
pass "the invitation is in the attendee's calendar"
