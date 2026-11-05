import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'

const event = {
  uid: 'event-uid-1',
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-uid-1.ics',
  start: '',
  attendee: []
} as unknown as CalendarEvent

const withoutDtend = (dtstart: string): VCalComponent =>
  [
    'vcalendar',
    [],
    [
      [
        'vevent',
        [
          ['uid', {}, 'text', 'event-uid-1'],
          ['dtstart', {}, 'date-time', dtstart]
        ],
        []
      ]
    ]
  ] as unknown as VCalComponent

describe('the end of a timed event without DTEND', () => {
  it('is 30 minutes after a start in the basic format', () => {
    const parsed = parseFetchedEvent(event, withoutDtend('20250315T100000Z'))

    expect(parsed.start).toBe('2025-03-15T10:00:00Z')
    expect(new Date(parsed.end as string).toISOString()).toBe(
      '2025-03-15T10:30:00.000Z'
    )
  })

  it('is the start when the start cannot be read', () => {
    const parsed = parseFetchedEvent(
      event,
      withoutDtend('2026-12-31T23:59:60Z')
    )

    expect(parsed.start).toBe('2026-12-31T23:59:60Z')
    expect(parsed.end).toBe(parsed.start)
  })
})
