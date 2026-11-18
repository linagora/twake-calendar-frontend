#!/bin/bash
# A signed-in user sets an email reminder on an event: the reminder is scheduled (esn-sabre publishes the alarm on
# RabbitMQ, the side service computes when it is due and stores it in its alarm schedule, MongoDB's
# twake_calendar_alarm_events), for its recipient at the right time.
#
# Not the reminder mail itself: the side service of this stack runs its alarm scheduler with its default mode,
# `disabled` (alarm.event.scheduler.mode, absent from conf/side-service/configuration.properties): no reminder mail is
# ever sent (NOTES.md). The schedule is read where the scheduler would read it, directly in MongoDB (docker exec).
# Asynchronous: polls the schedule until the reminder is there or the wait is over.
. "$(dirname "$0")/lib.sh"

signed_in "$CHAOS_USER" U
uid="chaos-alarm-$(rand)"
url="$(event_url "$U_ID" "$uid")"
trap 'delete_quietly "$U_TOKEN" "$url"' EXIT
start_epoch=$(( $(date +%s) + 86400 + RANDOM % 86400 ))
start="$(date -u -d "@$start_epoch" +%Y%m%dT%H%M%SZ)"; end="$(date -u -d "@$((start_epoch + 1800))" +%Y%m%dT%H%M%SZ)"
due="$(date -u -d "@$((start_epoch - 600))" +%Y-%m-%dT%H:%M:%S.000Z)"
# as the web app writes an event: its organizer an accepted attendee (alarms are scheduled for accepted events only)
lines="ORGANIZER:mailto:$CHAOS_USER"$'\r\n'"ATTENDEE;PARTSTAT=ACCEPTED;ROLE=CHAIR:mailto:$CHAOS_USER"$'\r\n'
lines+="BEGIN:VALARM"$'\r\n'"TRIGGER:-PT10M"$'\r\n'"ACTION:EMAIL"$'\r\n'"ATTENDEE:mailto:$CHAOS_USER"$'\r\n'
lines+="SUMMARY:chaos $uid"$'\r\n'"DESCRIPTION:twake-chaos reminder"$'\r\n'"END:VALARM"$'\r\n'
code="$(put_event "$U_TOKEN" "$url" "$(ics_event "$uid" "chaos $uid" "$start" "$end" "$lines")")"
[ "$code" = 201 ] || fail "event with a reminder not created (PUT: HTTP $code)"

# the reminder in the schedule, on the primary of the replica set: prints its recipient and due time
scheduled() {
  local n out
  for n in $MONGO_NODES; do
    out="$(docker exec "$CHAOS_PROJECT-$n-1" mongosh --quiet esn_docker --eval "
      if (db.hello().isWritablePrimary) {
        const a = db.twake_calendar_alarm_events.findOne({eventUid: '$uid'});
        print(a ? a.recipient + ' ' + a.alarmTime.toISOString() : 'none');
      }" 2>/dev/null)"
    [ -n "$out" ] && break
  done
  [ "$out" = "$CHAOS_USER $due" ]
}
poll "$ASYNC_WAIT" 1 scheduled || fail "the reminder is not scheduled for $CHAOS_USER at $due after ${ASYNC_WAIT}s"
pass "the reminder is scheduled for its recipient, 10 min before the event"
