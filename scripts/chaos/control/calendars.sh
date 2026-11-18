#!/bin/bash
# A signed-in user's calendar list: the web app lists their calendars (GET dav/calendars/{id}.json), the user creates a
# calendar (POST, as the "new calendar" dialog), finds it in the list, then deletes it.
. "$(dirname "$0")/lib.sh"

signed_in "$CHAOS_USER" U
scope='personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&withRights=true'
list() { api "$U_TOKEN" -H 'Accept: application/calendar+json' "$API/dav/calendars/$U_ID.json?$scope"; }

out="$(list)"
[ "$(status_of "$out")" = 200 ] || fail "calendar list not served (HTTP $(status_of "$out"))"
body_of "$out" | jq -e --arg h "/calendars/$U_ID/$U_ID.json" '._embedded["dav:calendar"] | map(._links.self.href) | index($h)' >/dev/null 2>&1 \
  || fail "the calendar list lacks the default calendar"

cal="$(python3 -c 'import uuid; print(uuid.uuid4())')"
name="chaos $(rand)"
out="$(api "$U_TOKEN" -X POST -H 'Accept: application/json, text/plain, */*' \
  -d "$(jq -cn --arg id "$cal" --arg n "$name" '{id: $id, "dav:name": $n, "apple:color": "#3A87AD", "caldav:description": "twake-chaos"}')" \
  "$API/dav/calendars/$U_ID.json")"
code="$(status_of "$out")"
[ "$code" = 201 ] || fail "calendar not created (POST: HTTP $code)"
out="$(list)"
found="$(body_of "$out" | jq -r --arg h "/calendars/$U_ID/$cal.json" '._embedded["dav:calendar"][] | select(._links.self.href == $h) | .["dav:name"]' 2>/dev/null)"
code="$(api "$U_TOKEN" -X DELETE "$API/dav/calendars/$U_ID/$cal.json" | tail -n 1)"
[ "$found" = "$name" ] || fail "the created calendar is not in the list"
[ "$code" = 204 ] || fail "calendar not deleted (DELETE: HTTP $code)"
pass "calendars listed, one created, listed and deleted"
