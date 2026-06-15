import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { TIMEZONES } from '@common/utils/timezone-data'
import ICAL from 'ical.js'
import { CounterProposalPayload } from '@common/features/Events/EventDao'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeTimezone, makeVevent } from '@common/features/Events/utils'

export function makeCounterProposalPayload({
  event,
  senderEmail,
  recipientEmail,
  proposedStart,
  proposedEnd,
  message
}: {
  event: CalendarEvent
  senderEmail: string
  recipientEmail: string
  proposedStart: string
  proposedEnd: string
  message?: string
}): CounterProposalPayload {
  // Build the counter event with proposed dates
  const counterEvent: CalendarEvent = {
    ...event,
    start: proposedStart,
    end: proposedEnd,
    sequence: event.sequence ?? 0
  }
  // Build vevent jCal
  const vevent = makeVevent(
    counterEvent,
    counterEvent.timezone,
    !event.recurrenceId
  )

  if (message) {
    vevent[1].push(['comment', {}, 'text', message])
  }
  // Build vtimezone
  const timezoneData = TIMEZONES.zones[counterEvent.timezone]
  const vtimezone = makeTimezone(timezoneData, counterEvent)

  // Assemble full vcalendar with METHOD:COUNTER
  const jcal = [
    'vcalendar',
    [
      ['version', {}, 'text', '2.0'],
      ['prodid', {}, 'text', '-//OpenPaaS//OpenPaaS//EN'],
      ['method', {}, 'text', 'COUNTER']
    ],
    [vevent, vtimezone.component.jCal]
  ]

  // Serialize to raw ICS
  const counterICS = new ICAL.Component(jcal).toString()
  const payload: CounterProposalPayload = {
    ical: counterICS,
    sender: senderEmail,
    recipient: recipientEmail,
    uid: extractEventBaseUuid(event.uid),
    sequence: counterEvent.sequence ?? 0,
    method: 'COUNTER'
  }
  return payload
}
