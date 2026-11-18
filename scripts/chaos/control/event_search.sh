#!/bin/bash
# A signed-in user searches their events: an event just created (esn-sabre publishes it on RabbitMQ, the side service
# indexes it in OpenSearch) is found by a word of its title (POST calendar/api/events/search, as the search bar).
# Asynchronous: polls the search until the event is found or the wait is over.
. "$(dirname "$0")/lib.sh"

signed_in "$CHAOS_USER" U
token="$(rand)"
uid="chaos-search-$token"
day="$(date -u -d "+$((RANDOM % 20 + 5)) day" +%Y%m%d)"
url="$(event_url "$U_ID" "$uid")"
trap 'delete_quietly "$U_TOKEN" "$url"' EXIT
code="$(put_event "$U_TOKEN" "$url" "$(ics_event "$uid" "chaossearch$token review" "${day}T130000Z" "${day}T140000Z")")"
[ "$code" = 201 ] || fail "event not created (PUT: HTTP $code)"

query="$(jq -cn --arg q "chaossearch$token" --arg u "$U_ID" '{query: $q, calendars: [{calendarId: $u, userId: $u}]}')"
last=""
found() {
  local out
  out="$(api "$U_TOKEN" -X POST -H 'Content-Type: application/json' -d "$query" "$API/calendar/api/events/search?limit=30&offset=0")"
  last="$(status_of "$out")"
  [ "$last" = 200 ] && body_of "$out" | jq -e --arg u "$uid" '[._embedded.events[]?.data.uid] | index($u)' >/dev/null 2>&1
}
poll "$ASYNC_WAIT" 1 found || fail "the new event is not found by the search after ${ASYNC_WAIT}s (last search: HTTP $last)"
pass "the new event is found by the search"
