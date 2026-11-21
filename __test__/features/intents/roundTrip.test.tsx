import type { CalDavItem } from '@common/features/Calendars/types/CalendarApiTypes'
import type { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { extractCalendarEvents } from '@common/features/Calendars/utils/extractCalendarEvents'
import type { Calendar } from '@common/types/CalendarTypes'
import { createdEvent } from '@common/features/intents/newEventIntent'
import { foundLookup } from '@common/features/intents/openEventIntent'

// Twake Chat shows the card of a meeting made by the CREATE intent, then
// opens it with OPEN: the title and start CREATE gave back, given as
// `expected`, must match the same event, or the reply never goes at once.
const CAL_ID = 'u1/u1'
const calendar = {
  id: CAL_ID,
  name: 'c',
  link: `/calendars/${CAL_ID}.json`,
  color: { light: '#f00', dark: '#000' },
  events: {}
} as unknown as Calendar

const vevent = (props: unknown[][]): unknown[] => [
  'vevent',
  [['uid', {}, 'text', 'e1'], ['summary', {}, 'text', 'Standup'], ...props],
  []
]

// The event as the store holds it after the form saved it
const stored = (props: unknown[][]) => {
  const item = {
    _links: { self: { href: `/calendars/${CAL_ID}/e1.ics` } },
    etag: '"1"',
    status: 200,
    data: ['vcalendar', [], [vevent(props)]] as unknown as VCalComponent
  } as unknown as CalDavItem
  return extractCalendarEvents(item, { cal: calendar })
}

const matches = (events: ReturnType<typeof stored>): boolean => {
  const created = createdEvent(events[0])
  return (
    foundLookup({ calId: CAL_ID, events }, 'e1', 'me@x.org', {
      title: created.title,
      start: created.start
    }) as { isExpected: boolean }
  ).isExpected
}

describe('the title and start CREATE gives back match the event OPEN finds', () => {
  it('for a timed event', () => {
    expect(
      matches(
        stored([
          ['dtstart', {}, 'date-time', '2026-11-23T10:00:00Z'],
          ['dtend', {}, 'date-time', '2026-11-23T10:30:00Z']
        ])
      )
    ).toBe(true)
  })

  it('for an all-day event (midnight UTC of its day)', () => {
    const events = stored([
      ['dtstart', {}, 'date', '2026-11-23'],
      ['dtend', {}, 'date', '2026-11-24']
    ])
    expect(createdEvent(events[0]).start).toMatch(/^2026-11-23/)
    expect(matches(events)).toBe(true)
  })

  it('for a recurring event (the start of the master)', () => {
    expect(
      matches(
        stored([
          ['dtstart', {}, 'date-time', '2026-11-23T10:00:00Z'],
          ['dtend', {}, 'date-time', '2026-11-23T10:30:00Z'],
          ['rrule', {}, 'recur', { freq: 'WEEKLY' }]
        ])
      )
    ).toBe(true)
  })
})
