#!/bin/bash
# A signed-in user invites another user to an event: the attendee receives the invitation mail (esn-sabre publishes the
# iTIP request on RabbitMQ, the side service sends the mail over SMTP; caught by the mail catcher).
# Asynchronous: polls the mail catcher until the mail is there or the wait is over.
. "$(dirname "$0")/lib.sh"

signed_in "$CHAOS_USER" U
uid="chaos-invite-mail-$(rand)"
day="$(date -u -d "+$((RANDOM % 20 + 5)) day" +%Y%m%d)"
url="$(event_url "$U_ID" "$uid")"
# cleaning: the organizer's event, then the attendee's copy when one can be had (the cancellation only marks it cancelled)
cleanup() {
  delete_quietly "$U_TOKEN" "$url"
  local t a
  t="$(session_token "$CHAOS_USER2")" || return 0
  a="$(api "$t" "$API/api/user" | sed '$d' | jq -r '._id // empty' 2>/dev/null)"
  [ -n "$a" ] && delete_matching "$t" "$a" "$day" "$uid"
}
trap cleanup EXIT
attendees="ORGANIZER:mailto:$CHAOS_USER"$'\r\n'"ATTENDEE;PARTSTAT=ACCEPTED;ROLE=CHAIR:mailto:$CHAOS_USER"$'\r\n'"ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:$CHAOS_USER2"$'\r\n'
code="$(put_event "$U_TOKEN" "$url" "$(ics_event "$uid" "chaos $uid" "${day}T150000Z" "${day}T160000Z" "$attendees")")"
[ "$code" = 201 ] || fail "event with an attendee not created (PUT: HTTP $code)"

poll "$ASYNC_WAIT" 1 mail_to "$CHAOS_USER2" "$uid" || fail "no invitation mail to $CHAOS_USER2 after ${ASYNC_WAIT}s"
pass "the attendee received the invitation mail"
