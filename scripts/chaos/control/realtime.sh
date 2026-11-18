#!/bin/bash
# A signed-in user's open calendar refreshes by itself: the web app's WebSocket (a ticket, then /ws, the user's calendar
# registered) is pushed the new sync token of the calendar when an event is written to it (esn-sabre publishes the
# change on RabbitMQ, the side service relays it to the connections through its event bus, Redis).
# Asynchronous: waits for the push until it comes or the wait is over.
. "$(dirname "$0")/lib.sh"

signed_in "$CHAOS_USER" U
uid="chaos-realtime-$(rand)"
day="$(date -u -d "+$((RANDOM % 20 + 5)) day" +%Y%m%d)"
url="$(event_url "$U_ID" "$uid")"
trap 'delete_quietly "$U_TOKEN" "$url"' EXIT
python3 -I "$CONTROL_DIR/realtime.py" "$API" "$CHAOS_API_HOST" "$U_TOKEN" "$U_ID" "$url" \
  "$(ics_event "$uid" "chaos $uid" "${day}T110000Z" "${day}T120000Z")" "$ASYNC_WAIT"
