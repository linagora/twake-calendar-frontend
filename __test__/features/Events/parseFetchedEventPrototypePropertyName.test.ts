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

const ics = (...extra: string[]) =>
  [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:event-uid-1',
    'DTSTART:20260908T080000Z',
    'DTEND:20260908T083000Z',
    ...extra,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

describe('a property named like an Object.prototype member', () => {
  it.each(['__proto__:x', 'CONSTRUCTOR:x'])('is ignored: %s', line => {
    const parsed = parseFetchedEvent(event, ICAL.parse(ics(line)))

    expect(parsed.start).toBe('2026-09-08T08:00:00Z')
    expect(parsed.end).toBe('2026-09-08T08:30:00Z')
  })

  it('is ignored when sent directly as jCal', () => {
    const jcal = ICAL.parse(ics())
    jcal[2][0][1].push(['__proto__', {}, 'text', 'x'])

    const parsed = parseFetchedEvent(event, jcal)

    expect(parsed.start).toBe('2026-09-08T08:00:00Z')
  })

  it.each(['__proto__:x', 'CONSTRUCTOR:x'])(
    'is ignored inside a VALARM: %s',
    line => {
      const parsed = parseFetchedEvent(
        event,
        ICAL.parse(
          ics(
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'TRIGGER:-PT15M',
            line,
            'END:VALARM'
          )
        )
      )

      expect(parsed.start).toBe('2026-09-08T08:00:00Z')
      expect(parsed.alarms?.getAlarms()).toHaveLength(1)
    }
  )
})
