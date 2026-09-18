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

  describe('the zone the event was written in', () => {
    function extract(components: unknown[]) {
      const item = {
        _links: { self: { href: '/calendars/u1/u1/event-uid.ics' } },
        data: ['vcalendar', [], components]
      } as unknown as CalDavItem

      return extractCalendarEvents(item, { cal, color: cal.color })[0]
    }

    it('comes from the sibling VTIMEZONE', () => {
      // An expanded REPORT states every time in UTC: without its VTIMEZONE, a
      // meeting created in Tokyo would reopen in the timezone of the browser.
      const tokyo = ['vtimezone', [['tzid', {}, 'text', 'Asia/Tokyo']], []]

      expect(extract([vevent, tokyo]).timezone).toBe('Asia/Tokyo')
    })

    it('is left unknown when nothing states it, so the event gets read back', () => {
      expect(extract([vevent]).timezone).toBeUndefined()
    })

    it('reaches the recurrence rule, which states its UNTIL against it', () => {
      // A non expanded read returns the master VEVENT with its RRULE: the zone
      // has to be settled before the rule is built, or the UNTIL it is saved
      // back with would be computed against UTC instead.
      const tokyo = ['vtimezone', [['tzid', {}, 'text', 'Asia/Tokyo']], []]
      const everyDay = [
        'vevent',
        [
          ['uid', {}, 'text', 'event-uid'],
          ['summary', {}, 'text', 'My event'],
          ['dtstart', {}, 'date-time', '20250315T100000Z'],
          ['dtend', {}, 'date-time', '20250315T110000Z'],
          ['rrule', {}, 'recur', { freq: 'DAILY', until: '2025-03-20' }]
        ],
        []
      ]

      expect(extract([everyDay, tokyo]).repetition?.timezone).toBe('Asia/Tokyo')
    })

    it('is the one DTSTART carries, when it carries one', () => {
      const newYork = { tzid: 'America/New_York' }
      const inNewYork = [
        'vevent',
        [
          ['uid', {}, 'text', 'event-uid'],
          ['summary', {}, 'text', 'My event'],
          ['dtstart', newYork, 'date-time', '20250315T100000'],
          ['dtend', newYork, 'date-time', '20250315T110000']
        ],
        []
      ]

      expect(extract([inNewYork]).timezone).toBe('America/New_York')
    })
  })
})
