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

const parseWithoutDtend = (
  tzid: string,
  dtstart: string,
  duration?: string
): { start: string; end: string } => {
  const properties = [
    ['uid', {}, 'text', 'event-uid-1'],
    ['dtstart', { tzid }, 'date-time', dtstart],
    ...(duration ? [['duration', {}, 'duration', duration]] : [])
  ]
  const parsed = parseFetchedEvent(event, [
    'vcalendar',
    [],
    [['vevent', properties, []]]
  ] as unknown as VCalComponent)
  return {
    start: new Date(parsed.start).toISOString(),
    end: new Date(parsed.end as string).toISOString()
  }
}

// vitest.config.mts sets TZ=UTC: the browser is in another zone than the event
describe('the end computed for an event with a TZID and no DTEND', () => {
  it('is the DURATION after the start', () => {
    expect(
      parseWithoutDtend('America/New_York', '2026-06-11T10:00:00', 'PT1H')
    ).toEqual({
      start: '2026-06-11T14:00:00.000Z',
      end: '2026-06-11T15:00:00.000Z'
    })
  })

  it('is 30 minutes after the start without a DURATION', () => {
    expect(parseWithoutDtend('Europe/Paris', '2026-06-11T10:00:00')).toEqual({
      start: '2026-06-11T08:00:00.000Z',
      end: '2026-06-11T08:30:00.000Z'
    })
  })

  it('keeps the seconds of the offset of an old zone', () => {
    expect(parseWithoutDtend('Africa/Monrovia', '1970-06-11T10:00:00')).toEqual(
      {
        start: '1970-06-11T10:44:30.000Z',
        end: '1970-06-11T11:14:30.000Z'
      }
    )
  })

  it('keeps the length across the start of summer time', () => {
    expect(
      parseWithoutDtend('America/New_York', '2026-03-08T01:30:00', 'PT1H')
    ).toEqual({
      start: '2026-03-08T06:30:00.000Z',
      end: '2026-03-08T07:30:00.000Z'
    })
  })

  it('ends in the second reading of the hour repeated at the end of summer time', () => {
    expect(
      parseWithoutDtend('America/New_York', '2026-11-01T01:30:00', 'PT1H')
    ).toEqual({
      start: '2026-11-01T05:30:00.000Z',
      end: '2026-11-01T06:30:00.000Z'
    })
  })
})

describe('the end computed for an event in a zone only its VTIMEZONE defines', () => {
  it('is the DURATION after the start read with that VTIMEZONE', () => {
    const parsed = parseFetchedEvent(event, [
      'vcalendar',
      [],
      [
        [
          'vtimezone',
          [['tzid', {}, 'text', 'Customized Time Zone']],
          [
            [
              'standard',
              [
                ['dtstart', {}, 'date-time', '1970-01-01T00:00:00'],
                ['tzoffsetfrom', {}, 'utc-offset', '-05:00'],
                ['tzoffsetto', {}, 'utc-offset', '-05:00']
              ],
              []
            ]
          ]
        ],
        [
          'vevent',
          [
            ['uid', {}, 'text', 'event-uid-1'],
            [
              'dtstart',
              { tzid: 'Customized Time Zone' },
              'date-time',
              '2026-06-11T10:00:00'
            ],
            ['duration', {}, 'duration', 'PT1H']
          ],
          []
        ]
      ]
    ] as unknown as VCalComponent)

    expect(new Date(parsed.start).toISOString()).toBe(
      '2026-06-11T15:00:00.000Z'
    )
    expect(new Date(parsed.end as string).toISOString()).toBe(
      '2026-06-11T16:00:00.000Z'
    )
  })
})
