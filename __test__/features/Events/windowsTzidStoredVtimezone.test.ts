import { resolveRepetition } from '@common/components/Event/utils/initialValues/recurrenceResolvers'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { makeEventWithOverrides } from '@common/features/Events/transformers'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'

// A Windows TZID the alias table maps to an IANA zone is read in that zone,
// even when a VTIMEZONE of that name with other offsets is stored (#2065)

function listOverrides(components: VCalComponent[]): VCalComponent[] {
  return components.filter(
    ([name, props]) =>
      name === 'vevent' &&
      (props as VObjectProperty[]).some(([k]) => k === 'recurrence-id')
  )
}

function prop(
  component: VCalComponent | undefined,
  name: string
): VObjectProperty | undefined {
  return (component?.[1] as VObjectProperty[] | undefined)?.find(
    ([k]) => k === name
  )
}

describe('makeSeriesJCal — time move of a series with a Windows TZID and a stored VTIMEZONE', () => {
  const windowsTzid = 'Pacific Standard Time (Mexico)'
  // Fixed -05:00, unlike America/Santa_Isabel, the zone of the alias table
  const vtimezone = [
    'vtimezone',
    [['tzid', {}, 'text', windowsTzid]],
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
  ] as unknown as VCalComponent

  const master = (rrule: Record<string, unknown>): VCalComponent =>
    [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        ['dtstart', { tzid: windowsTzid }, 'date-time', '2022-02-07T10:15:00'],
        ['dtend', { tzid: windowsTzid }, 'date-time', '2022-02-07T10:45:00'],
        ['rrule', {}, 'recur', rrule],
        ['summary', {}, 'text', 'Monthly review']
      ],
      []
    ] as unknown as VCalComponent

  const override = [
    'vevent',
    [
      ['uid', {}, 'text', 'series-1'],
      ['recurrence-id', {}, 'date-time', '2024-11-07T18:15:00Z'],
      ['dtstart', {}, 'date-time', '2024-11-07T18:15:00Z'],
      ['dtend', {}, 'date-time', '2024-11-07T18:45:00Z'],
      ['summary', {}, 'text', 'Monthly review (agenda changed)']
    ],
    []
  ] as unknown as VCalComponent

  // the form: 10:15 America/Santa_Isabel (UTC-8 in February) moved to 10:30
  const moveSeries = (vevents: VCalComponent[]): VCalComponent[] => {
    const vcalendar = ['vcalendar', [], [vtimezone, ...vevents]]
    const stored = parseFetchedEvent(
      { calId: 'user/cal' } as CalendarEvent,
      structuredClone(vcalendar) as unknown as VCalComponent,
      true
    )
    const { repetition } = resolveRepetition(stored, stored.calId, {})
    const event = {
      ...stored,
      uid: 'series-1',
      start: '2022-02-07T18:30:00.000Z',
      end: '2022-02-07T19:00:00.000Z',
      repetition: RepetitionObject.fromFormValues(repetition, {
        allday: false,
        timezone: 'America/Santa_Isabel'
      })
    } as CalendarEvent
    return makeSeriesJCal(structuredClone(vevents), event, {
      removeOverrides: false,
      followTimeChange: true,
      storedVtimezones: [vtimezone]
    })[2] as VCalComponent[]
  }

  it('moves the override by the 15 minutes of the series', () => {
    const [written] = listOverrides(
      moveSeries([master({ freq: 'MONTHLY' }), override])
    )

    expect(prop(written, 'recurrence-id')).toEqual([
      'recurrence-id',
      {},
      'date-time',
      '2024-11-07T18:30:00Z'
    ])
  })

  it('moves a DATE-TIME UNTIL by the 15 minutes of the series', () => {
    const components = moveSeries([
      master({ freq: 'MONTHLY', until: '2024-12-07T18:15:00Z' })
    ])
    const written = components.find(([name]) => name === 'vevent')

    expect(JSON.stringify(prop(written, 'rrule')?.[3])).toMatch(
      /2024-?12-?07T18:?30:?00Z/
    )
  })
})

describe('makeEventWithOverrides — Windows TZID RECURRENCE-ID with a stored VTIMEZONE', () => {
  const windowsTzid = 'Mountain Standard Time (Mexico)'
  // The DST rules Mexico had before 2022, unlike tzdata's America/Chihuahua
  const vtimezone = [
    'vtimezone',
    [['tzid', {}, 'text', windowsTzid]],
    [
      [
        'daylight',
        [
          ['dtstart', {}, 'date-time', '1970-04-05T02:00:00'],
          ['rrule', {}, 'recur', { freq: 'YEARLY', bymonth: 4, byday: '1SU' }],
          ['tzoffsetfrom', {}, 'utc-offset', '-07:00'],
          ['tzoffsetto', {}, 'utc-offset', '-06:00']
        ],
        []
      ],
      [
        'standard',
        [
          ['dtstart', {}, 'date-time', '1970-10-25T02:00:00'],
          [
            'rrule',
            {},
            'recur',
            { freq: 'YEARLY', bymonth: 10, byday: '-1SU' }
          ],
          ['tzoffsetfrom', {}, 'utc-offset', '-06:00'],
          ['tzoffsetto', {}, 'utc-offset', '-07:00']
        ],
        []
      ]
    ]
  ] as unknown as VCalComponent

  const master = [
    'vevent',
    [
      ['uid', {}, 'text', 'series-1'],
      [
        'dtstart',
        { tzid: 'America/Chihuahua' },
        'date-time',
        '2024-03-03T02:15:00'
      ],
      [
        'dtend',
        { tzid: 'America/Chihuahua' },
        'date-time',
        '2024-03-03T02:45:00'
      ],
      ['rrule', {}, 'recur', { freq: 'WEEKLY' }],
      ['summary', {}, 'text', 'Weekly']
    ],
    []
  ] as unknown as VCalComponent

  const storedRecurrenceId: VObjectProperty = [
    'recurrence-id',
    { tzid: windowsTzid },
    'date-time',
    '2024-03-24T02:15:00'
  ]

  const override = [
    'vevent',
    [
      ['uid', {}, 'text', 'series-1'],
      storedRecurrenceId,
      ['dtstart', { tzid: windowsTzid }, 'date-time', '2024-03-24T02:15:00'],
      ['dtend', { tzid: windowsTzid }, 'date-time', '2024-03-24T02:45:00'],
      ['summary', {}, 'text', 'Moved']
    ],
    []
  ] as unknown as VCalComponent

  it('replaces the override instead of duplicating its RECURRENCE-ID', () => {
    const edited = {
      uid: 'series-1/2024-03-24T08:15:00Z',
      recurrenceId: '2024-03-24T08:15:00Z',
      timezone: 'America/Chihuahua',
      start: '2024-03-24T08:15:00.000Z',
      end: '2024-03-24T08:45:00.000Z',
      attendee: [],
      title: 'Edited'
    } as unknown as CalendarEvent

    const overrides = listOverrides(
      makeEventWithOverrides(
        edited,
        [master, override],
        [vtimezone]
      )[2] as VCalComponent[]
    )

    expect(overrides).toHaveLength(1)
    expect(prop(overrides[0], 'recurrence-id')).toEqual(storedRecurrenceId)
    expect(prop(overrides[0], 'summary')?.[3]).toBe('Edited')
  })
})
