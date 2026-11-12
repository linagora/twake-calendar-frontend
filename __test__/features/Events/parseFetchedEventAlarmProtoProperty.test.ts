import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import ICAL from 'ical.js'

const event = {
  uid: 'event-uid-1',
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-uid-1.ics',
  start: '',
  attendee: []
} as unknown as CalendarEvent

const icsWithAlarmProperty = (line: string) =>
  [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:event-uid-1',
    'DTSTART:20260908T080000Z',
    'DTEND:20260908T083000Z',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT15M',
    line,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

describe('a VALARM property named like an Object.prototype member', () => {
  it.each(['__proto__:x', 'CONSTRUCTOR:x', 'TOSTRING:x'])(
    'is ignored and the alarm is kept: %s',
    line => {
      const parsed = parseFetchedEvent(
        event,
        ICAL.parse(icsWithAlarmProperty(line))
      )

      expect(parsed.start).toBe('2026-09-08T08:00:00Z')
      expect(parsed.alarms?.hasAlarms()).toBe(true)
      expect(parsed.alarms?.getAlarms()).toHaveLength(1)
    }
  )
})
