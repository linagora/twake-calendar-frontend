import { CalDavItem } from '@common/features/Calendars/types/CalendarApiTypes'
import { extractCalendarEvents } from '@common/features/Calendars/utils/extractCalendarEvents'
import { Calendar } from '@common/types/CalendarTypes'

const cal = {
  id: 'u1/u1',
  delegated: false,
  color: { 'apple:color': '#abc' }
} as unknown as Calendar

const vevent = [
  'vevent',
  [
    ['uid', {}, 'text', 'event-uid'],
    ['summary', {}, 'text', 'My event'],
    ['dtstart', {}, 'date-time', '20250315T100000Z'],
    ['dtend', {}, 'date-time', '20250315T110000Z']
  ],
  []
]

const vtimezone = [
  'vtimezone',
  [['tzid', {}, 'text', 'UTC']],
  [
    [
      'standard',
      [
        ['tzoffsetfrom', {}, 'utc-offset', '+00:00'],
        ['tzoffsetto', {}, 'utc-offset', '+00:00']
      ],
      []
    ]
  ]
]

describe('extractCalendarEvents', () => {
  it('parses VEVENT components into events', () => {
    const item = {
      _links: { self: { href: '/calendars/u1/u1/event-uid.ics' } },
      data: ['vcalendar', [], [vevent]]
    } as unknown as CalDavItem

    const events = extractCalendarEvents(item, { cal, color: cal.color })

    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('event-uid')
    expect(events[0].error).toBeUndefined()
  })

  it('ignores sibling VTIMEZONE components bundled alongside the VEVENT', () => {
    // The `uid` REPORT response wraps the VEVENT together with a VTIMEZONE in
    // the same calendar object; the VTIMEZONE must not be parsed as an event.
    const item = {
      _links: { self: { href: '/calendars/u1/u1/event-uid.ics' } },
      data: ['vcalendar', [], [vevent, vtimezone]]
    } as unknown as CalDavItem

    const events = extractCalendarEvents(item, { cal, color: cal.color })

    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('event-uid')
    expect(events[0].error).toBeUndefined()
  })
})
