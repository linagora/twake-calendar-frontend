import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { CalendarEvent } from '@common/types/EventsTypes'
import moment from 'moment-timezone'

const override = (tzid: string, wallClock: string): VCalComponent => [
  'vevent',
  [
    ['uid', {}, 'text', 'series-1'],
    ['recurrence-id', { tzid }, 'date-time', wallClock],
    ['dtstart', { tzid }, 'date-time', wallClock],
    ['summary', {}, 'text', `Override in ${tzid}`]
  ],
  []
]

const master: VCalComponent = [
  'vevent',
  [
    ['uid', {}, 'text', 'series-1'],
    [
      'dtstart',
      { tzid: 'America/Toronto' },
      'date-time',
      '2030-10-27T02:30:00'
    ],
    ['dtend', { tzid: 'America/Toronto' }, 'date-time', '2030-10-27T03:30:00'],
    ['rrule', {}, 'recur', { freq: 'WEEKLY', count: 10 }]
  ],
  []
]

// From 02:30 to 01:30 on the same day, while Toronto leaves summer time on
// 3 November 2030 and La Paz has no summer time
const recurrenceIdsAfterMove = (
  overrides: VCalComponent[]
): { tzid: string; wallClock: string; instant: string }[] => {
  const jCal = makeSeriesJCal(
    [master, ...overrides],
    {
      uid: 'series-1',
      calId: 'u/c',
      title: 'Series',
      attendee: [],
      timezone: 'America/Toronto',
      start: '2030-10-27T05:30:00.000Z',
      end: '2030-10-27T06:30:00.000Z'
    } as unknown as CalendarEvent,
    { removeOverrides: false, followTimeChange: true }
  )
  return (jCal[2] as VCalComponent[])
    .filter(([name]) => name === 'vevent')
    .flatMap(([, props]) => props.filter(([name]) => name === 'recurrence-id'))
    .map(([, params, , value]) => {
      const tzid = (params as { tzid: string }).tzid
      return {
        tzid,
        wallClock: value as string,
        instant: moment
          .tz(value as string, moment.tz.zone(tzid) ? tzid : 'America/La_Paz')
          .toISOString()
      }
    })
}

describe('the overrides of another zone when a series changes its time of day', () => {
  it('keep distinct RECURRENCE-IDs across a DST change', () => {
    expect(
      recurrenceIdsAfterMove([
        override('America/Toronto', '2030-11-03T02:30:00'),
        override('America/La_Paz', '2030-11-03T02:30:00')
      ])
    ).toEqual([
      {
        tzid: 'America/Toronto',
        wallClock: '2030-11-03T01:30:00',
        instant: '2030-11-03T05:30:00.000Z'
      },
      {
        tzid: 'America/La_Paz',
        wallClock: '2030-11-03T00:30:00',
        instant: '2030-11-03T04:30:00.000Z'
      }
    ])
  })

  it('follow the occurrence they designate', () => {
    // 03:30 in La Paz is the occurrence at 02:30 EST, which moves to 01:30 EDT
    const [recurrenceId] = recurrenceIdsAfterMove([
      override('America/La_Paz', '2030-11-03T03:30:00')
    ])

    expect(recurrenceId).toEqual({
      tzid: 'America/La_Paz',
      wallClock: '2030-11-03T01:30:00',
      instant: '2030-11-03T05:30:00.000Z'
    })
  })

  it('resolve a Windows name of another zone and keep it written', () => {
    const [recurrenceId] = recurrenceIdsAfterMove([
      override('SA Western Standard Time', '2030-11-03T03:30:00')
    ])

    expect(recurrenceId).toMatchObject({
      tzid: 'SA Western Standard Time',
      wallClock: '2030-11-03T01:30:00'
    })
  })

  it('move in their own wall clock when their zone is the zone of the series', () => {
    const [recurrenceId] = recurrenceIdsAfterMove([
      override('America/Toronto', '2030-11-10T02:30:00')
    ])

    expect(recurrenceId.wallClock).toBe('2030-11-10T01:30:00')
  })

  it('keep the old reading for a TZID nothing tells the zone of', () => {
    const [recurrenceId] = recurrenceIdsAfterMove([
      override('Mars/Olympus_Mons', '2030-11-03T02:30:00')
    ])

    expect(recurrenceId.wallClock).toBe('2030-11-03T01:30:00')
  })
})

describe('the overrides of a known zone in a series only a VTIMEZONE defines', () => {
  it('move in the zone of that VTIMEZONE', () => {
    const custom = { tzid: 'Customized Time Zone' }
    const vtimezone: VCalComponent = [
      'vtimezone',
      [['tzid', {}, 'text', custom.tzid]],
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
    ]
    const customMaster: VCalComponent = [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        ['dtstart', custom, 'date-time', '2030-10-27T00:30:00'],
        ['dtend', custom, 'date-time', '2030-10-27T01:30:00'],
        ['rrule', {}, 'recur', { freq: 'WEEKLY', count: 10 }]
      ],
      []
    ]

    // 01:30 EDT in Toronto is 00:30 in the custom zone: an hour later, 01:30
    // there is 06:30Z, the second reading of 01:30 in Toronto
    const jCal = makeSeriesJCal(
      [customMaster, override('America/Toronto', '2030-11-03T01:30:00')],
      {
        uid: 'series-1',
        calId: 'u/c',
        title: 'Series',
        attendee: [],
        timezone: custom.tzid,
        start: '2030-10-27T06:30:00.000Z',
        end: '2030-10-27T07:30:00.000Z'
      } as unknown as CalendarEvent,
      {
        removeOverrides: false,
        followTimeChange: true,
        storedVtimezones: [vtimezone]
      }
    )

    const recurrenceId = (jCal[2] as VCalComponent[])
      .filter(([name]) => name === 'vevent')
      .flatMap(([, props]) => props)
      .find(([name]) => name === 'recurrence-id')
    expect(recurrenceId?.[1]).toEqual({ tzid: 'America/Toronto' })
    expect(recurrenceId?.[3]).toBe('2030-11-03T01:30:00')
  })
})
