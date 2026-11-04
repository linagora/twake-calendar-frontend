import ICAL from 'ical.js'
import moment from 'moment-timezone'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import { formatDateTimeToICal } from '@common/features/Events/utils/formatDateToICal'
import {
  convertEventDateTimeToISO,
  readWallClock,
  wallClockOf,
  withStoredTimezones
} from '@common/utils/timezone'

// An "All the events" edit that keeps the overrides of a series in a zone only
// defined by its VTIMEZONE: the shift of the series, the overrides and EXDATEs
// it moves are computed with that VTIMEZONE, not as UTC. See #1941.
const TZID = 'Customized Time Zone'

// Outlook writes the rules of Europe/Paris under a custom name: the offset
// changes on 2025-10-26, so a fixed offset is not enough
const vtimezoneLines = (tzid: string): string[] => [
  'BEGIN:VTIMEZONE',
  `TZID:${tzid}`,
  'BEGIN:STANDARD',
  'DTSTART:16010101T030000',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:16010101T020000',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
  'END:DAYLIGHT',
  'END:VTIMEZONE'
]

// Weekly at 10:00 local, 13/10 (summer time) to 24/11 (winter time):
// - 20/10 renamed, at the time of the series
// - 27/10 excluded with a TZID value, 17/11 with a UTC value (10:00 winter)
// - 03/11 rescheduled to 15:00
// - 10/11 renamed, stored in UTC form (10:00 winter = 09:00Z)
const seriesIcs = (tzid: string, rrule = 'FREQ=WEEKLY;COUNT=7'): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    ...vtimezoneLines(tzid),
    'BEGIN:VEVENT',
    'UID:series-1',
    'DTSTAMP:20250101T000000Z',
    `DTSTART;TZID=${tzid}:20251013T100000`,
    `DTEND;TZID=${tzid}:20251013T110000`,
    `RRULE:${rrule}`,
    `EXDATE;TZID=${tzid}:20251027T100000`,
    'EXDATE:20251117T090000Z',
    'SUMMARY:Weekly sync',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:series-1',
    'DTSTAMP:20250101T000000Z',
    `RECURRENCE-ID;TZID=${tzid}:20251020T100000`,
    `DTSTART;TZID=${tzid}:20251020T100000`,
    `DTEND;TZID=${tzid}:20251020T110000`,
    'SUMMARY:Own title',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:series-1',
    'DTSTAMP:20250101T000000Z',
    `RECURRENCE-ID;TZID=${tzid}:20251103T100000`,
    `DTSTART;TZID=${tzid}:20251103T150000`,
    `DTEND;TZID=${tzid}:20251103T160000`,
    'SUMMARY:Weekly sync',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:series-1',
    'DTSTAMP:20250101T000000Z',
    'RECURRENCE-ID:20251110T090000Z',
    'DTSTART:20251110T090000Z',
    'DTEND:20251110T100000Z',
    'SUMMARY:UTC override',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

const components = (jcal: VCalComponent, name: string): VCalComponent[] =>
  (jcal[2] ?? []).filter(([n]) => n === name)

const props = (vevent: VCalComponent, name: string): VObjectProperty[] =>
  vevent[1].filter(([n]) => n === name)

const values = (vevent: VCalComponent, name: string): unknown[] =>
  props(vevent, name).map(prop => prop[3])

const tzids = (vevent: VCalComponent, name: string): unknown[] =>
  props(vevent, name).map(prop => prop[1].tzid)

const recurrenceIdOf = (vevent: VCalComponent): unknown =>
  values(vevent, 'recurrence-id')[0]

const masterOf = (jcal: VCalComponent): VCalComponent =>
  components(jcal, 'vevent').find(v => !recurrenceIdOf(v)) as VCalComponent

const overrideOf = (jcal: VCalComponent, rid: string): VCalComponent => {
  const override = components(jcal, 'vevent').find(
    v => recurrenceIdOf(v) === rid
  )
  if (!override) {
    throw new Error(
      `No override ${rid} in ${JSON.stringify(components(jcal, 'vevent').map(recurrenceIdOf))}`
    )
  }
  return override
}

const loadSeries = (
  tzid: string,
  rrule?: string
): { jcal: VCalComponent; master: CalendarEvent } => {
  const jcal = ICAL.parse(seriesIcs(tzid, rrule)) as VCalComponent
  const master = parseFetchedEvent(
    { calId: 'user/cal' } as CalendarEvent,
    jcal,
    true
  )
  return { jcal, master: { ...master, uid: 'series-1' } }
}

// 10:00 -> 11:00 local on 13/10, ie 09:00Z in summer time
const MOVED = {
  start: '2025-10-13T09:00:00.000Z',
  end: '2025-10-13T10:00:00.000Z'
}

const moveSeries = (
  tzid: string,
  options: { rrule?: string; sourceRecurrenceId?: string } = {}
): VCalComponent => {
  const { jcal, master } = loadSeries(tzid, options.rrule)
  return makeSeriesJCal(
    components(jcal, 'vevent'),
    { ...master, ...MOVED },
    {
      removeOverrides: false,
      followTimeChange: true,
      sourceRecurrenceId: options.sourceRecurrenceId,
      storedVtimezones: components(jcal, 'vtimezone')
    }
  )
}

// Runs with the VTIMEZONEs of the output registered, as any CalDAV client
// reading it back would
const withOutputZones = <T>(jcal: VCalComponent, fn: () => T): T => {
  const calendar = new ICAL.Component(jcal as unknown[])
  calendar
    .getAllSubcomponents('vtimezone')
    .forEach(vtimezone =>
      ICAL.TimezoneService.register(new ICAL.Timezone(vtimezone), TZID)
    )
  try {
    return fn()
  } finally {
    ICAL.TimezoneService.remove(TZID)
  }
}

const toUtc = (vevent: VCalComponent, name: string): string[] => {
  const component = new ICAL.Component(vevent as unknown[])
  return component
    .getAllProperties(name)
    .flatMap(prop => prop.getValues() as ICAL.Time[])
    .map(time => new Date(time.toUnixTime() * 1000).toISOString())
}

afterEach(() => {
  // No test may leak a custom zone into the global registry
  expect(ICAL.TimezoneService.has(TZID)).toBe(false)
  expect(ICAL.TimezoneService.has('Custom Paris')).toBe(false)
})

describe('"All the events" time change of a series in a custom VTIMEZONE', () => {
  it('reads the stored series at the instants of the VTIMEZONE', () => {
    const { master } = loadSeries(TZID)
    expect(master.timezone).toBe(TZID)
    expect(new Date(master.start).toISOString()).toBe(
      '2025-10-13T08:00:00.000Z'
    )
  })

  it('moves the master to 11:00 local, keeping its TZID', () => {
    const master = masterOf(moveSeries(TZID))
    expect(values(master, 'dtstart')).toEqual(['2025-10-13T11:00:00'])
    expect(tzids(master, 'dtstart')).toEqual([TZID])
    expect(values(master, 'dtend')).toEqual(['2025-10-13T12:00:00'])
    expect(tzids(master, 'dtend')).toEqual([TZID])
  })

  it('moves the EXDATEs by one hour of wall clock, on both sides of the DST change', () => {
    const master = masterOf(moveSeries(TZID))
    const exdates = props(master, 'exdate').map(([, params, , value]) => [
      params.tzid,
      value
    ])
    expect(exdates).toEqual([
      [TZID, '2025-10-27T11:00:00'],
      // 11:00 winter time
      [undefined, '2025-11-17T10:00:00Z']
    ])
  })

  it('re-anchors an override that follows the series, and moves its time', () => {
    const renamed = overrideOf(moveSeries(TZID), '2025-10-20T11:00:00')
    expect(tzids(renamed, 'recurrence-id')).toEqual([TZID])
    expect(values(renamed, 'dtstart')).toEqual(['2025-10-20T11:00:00'])
    expect(values(renamed, 'dtend')).toEqual(['2025-10-20T12:00:00'])
    expect(values(renamed, 'summary')).toEqual(['Own title'])
  })

  it('re-anchors a rescheduled override after the DST change, keeping its own time', () => {
    const moved = overrideOf(moveSeries(TZID), '2025-11-03T11:00:00')
    expect(values(moved, 'dtstart')).toEqual(['2025-11-03T15:00:00'])
    expect(values(moved, 'dtend')).toEqual(['2025-11-03T16:00:00'])
  })

  it('moves an override stored in UTC with the winter offset', () => {
    const utc = overrideOf(moveSeries(TZID), '2025-11-10T10:00:00Z')
    expect(values(utc, 'dtstart')).toEqual(['2025-11-10T10:00:00Z'])
    expect(values(utc, 'dtend')).toEqual(['2025-11-10T11:00:00Z'])
    expect(values(utc, 'summary')).toEqual(['UTC override'])
  })

  it('keeps every override on an occurrence of the moved series', () => {
    const jcal = moveSeries(TZID)
    const master = masterOf(jcal)
    const overrides = components(jcal, 'vevent').filter(recurrenceIdOf)
    expect(overrides).toHaveLength(3)

    withOutputZones(jcal, () => {
      const expansion = new ICAL.RecurExpansion({
        component: new ICAL.Component(master as unknown[]),
        dtstart: new ICAL.Event(new ICAL.Component(master as unknown[]))
          .startDate
      })
      const occurrences: string[] = []
      for (let next = expansion.next(); next; next = expansion.next()) {
        occurrences.push(new Date(next.toUnixTime() * 1000).toISOString())
      }

      // 11:00 local all along: 09:00Z in summer time, 10:00Z in winter time,
      // without 27/10 and 17/11
      expect(occurrences).toEqual([
        '2025-10-13T09:00:00.000Z',
        '2025-10-20T09:00:00.000Z',
        '2025-11-03T10:00:00.000Z',
        '2025-11-10T10:00:00.000Z',
        '2025-11-24T10:00:00.000Z'
      ])
      expect(overrides.flatMap(o => toUtc(o, 'recurrence-id')).sort()).toEqual([
        '2025-10-20T09:00:00.000Z',
        '2025-11-03T10:00:00.000Z',
        '2025-11-10T10:00:00.000Z'
      ])
      expect(toUtc(master, 'exdate')).toEqual([
        '2025-10-27T10:00:00.000Z',
        '2025-11-17T10:00:00.000Z'
      ])
    })
  })

  it('writes the same series as for Europe/Paris, which has the same rules', () => {
    const rename = (jcal: VCalComponent): string =>
      JSON.stringify(components(jcal, 'vevent'))
        .replaceAll(TZID, '<zone>')
        .replaceAll('Europe/Paris', '<zone>')
        .replace(/"dtstamp",\{\},"date-time","[^"]*"/g, '"dtstamp"')

    expect(rename(moveSeries(TZID))).toBe(rename(moveSeries('Europe/Paris')))
  })

  it('moves a stored BYHOUR with the local time of day', () => {
    const master = masterOf(
      moveSeries(TZID, { rrule: 'FREQ=DAILY;BYHOUR=10;COUNT=7' })
    )
    const rrule = values(master, 'rrule')[0] as { byhour: unknown }
    expect(rrule.byhour).toEqual(11)
  })

  it('leaves overrides and EXDATEs in place without a time change', () => {
    const { jcal, master } = loadSeries(TZID)
    const out = makeSeriesJCal(
      components(jcal, 'vevent'),
      { ...master, title: 'Renamed' },
      {
        removeOverrides: false,
        storedVtimezones: components(jcal, 'vtimezone')
      }
    )
    expect(values(masterOf(out), 'dtstart')).toEqual(['2025-10-13T10:00:00'])
    expect(values(masterOf(out), 'exdate')).toEqual([
      '2025-10-27T10:00:00',
      '2025-11-17T09:00:00Z'
    ])
    expect(values(overrideOf(out, '2025-10-20T10:00:00'), 'dtstart')).toEqual([
      '2025-10-20T10:00:00'
    ])
    expect(values(overrideOf(out, '2025-11-03T10:00:00'), 'dtstart')).toEqual([
      '2025-11-03T15:00:00'
    ])
    expect(values(overrideOf(out, '2025-11-10T09:00:00Z'), 'dtstart')).toEqual([
      '2025-11-10T09:00:00Z'
    ])
  })

  describe('the override the edit started from', () => {
    const remainingIds = (jcal: VCalComponent): unknown[] =>
      components(jcal, 'vevent').map(recurrenceIdOf).filter(Boolean).sort()

    it('is dropped when designated by its local wall clock', () => {
      expect(
        remainingIds(
          moveSeries(TZID, { sourceRecurrenceId: '2025-11-03T10:00:00' })
        )
      ).toEqual(['2025-10-20T11:00:00', '2025-11-10T10:00:00Z'])
    })

    it('is dropped when designated by its UTC instant', () => {
      // 03/11 10:00 winter time
      expect(
        remainingIds(
          moveSeries(TZID, { sourceRecurrenceId: '2025-11-03T09:00:00Z' })
        )
      ).toEqual(['2025-10-20T11:00:00', '2025-11-10T10:00:00Z'])
    })

    it('matches the override stored in UTC from its local wall clock', () => {
      expect(
        remainingIds(
          moveSeries(TZID, { sourceRecurrenceId: '2025-11-10T10:00:00' })
        )
      ).toEqual(['2025-10-20T11:00:00', '2025-11-03T11:00:00'])
    })

    it('is not mistaken for another instant', () => {
      // 10:00Z is 11:00 local: no override there
      expect(
        remainingIds(
          moveSeries(TZID, { sourceRecurrenceId: '2025-11-03T10:00:00Z' })
        )
      ).toEqual([
        '2025-10-20T11:00:00',
        '2025-11-03T11:00:00',
        '2025-11-10T10:00:00Z'
      ])
    })
  })
})

describe('readWallClock and wallClockOf in a stored custom zone', () => {
  const vtimezones = components(
    ICAL.parse(seriesIcs(TZID)) as VCalComponent,
    'vtimezone'
  )

  it('read a wall clock with the offset in force at that date', () => {
    withStoredTimezones(vtimezones, () => {
      const summer = readWallClock('2025-07-01T10:00:00', TZID)
      expect(summer.toISOString()).toBe('2025-07-01T08:00:00.000Z')
      expect(summer.hours()).toBe(10)
      expect(summer.utcOffset()).toBe(120)

      const winter = readWallClock('2025-12-01T10:00:00', TZID)
      expect(winter.toISOString()).toBe('2025-12-01T09:00:00.000Z')
      expect(winter.hours()).toBe(10)
      expect(winter.utcOffset()).toBe(60)
    })
  })

  it('resolve a repeated wall clock to its first occurrence, as RFC 5545 requires', () => {
    withStoredTimezones(vtimezones, () => {
      // 02:30 happens at 00:30Z (summer time) then at 01:30Z on 26/10
      expect(readWallClock('2025-10-26T02:30:00', TZID).toISOString()).toBe(
        '2025-10-26T00:30:00.000Z'
      )
      expect(wallClockOf(moment.utc('2025-10-26T00:30:00Z'), TZID)).toBe(
        '2025-10-26T02:30:00'
      )
      expect(wallClockOf(moment.utc('2025-10-26T01:30:00Z'), TZID)).toBe(
        '2025-10-26T02:30:00'
      )
      expect(wallClockOf(moment.utc('2025-10-26T01:00:00Z'), TZID)).toBe(
        '2025-10-26T02:00:00'
      )
    })
  })

  it('read a skipped wall clock with the offset before the change', () => {
    withStoredTimezones(vtimezones, () => {
      // 02:30 does not exist on 30/03: read with +01:00, it is 03:30 local
      expect(readWallClock('2025-03-30T02:30:00', TZID).toISOString()).toBe(
        '2025-03-30T01:30:00.000Z'
      )
      expect(wallClockOf(moment.utc('2025-03-30T01:00:00Z'), TZID)).toBe(
        '2025-03-30T03:00:00'
      )
      expect(wallClockOf(moment.utc('2025-03-30T00:59:59Z'), TZID)).toBe(
        '2025-03-30T01:59:59'
      )
    })
  })
  it('fall back to moment-timezone outside of withStoredTimezones', () => {
    const instant = moment.utc('2025-07-01T08:00:00Z')
    expect(wallClockOf(instant, 'Europe/Paris')).toBe('2025-07-01T10:00:00')
    expect(
      readWallClock('2025-07-01T10:00:00', 'Europe/Paris').toISOString()
    ).toBe('2025-07-01T08:00:00.000Z')
  })

  it('unregister the zone when the call throws', () => {
    expect(() =>
      withStoredTimezones(vtimezones, () => {
        throw new Error('boom')
      })
    ).toThrow('boom')
    expect(ICAL.TimezoneService.has(TZID)).toBe(false)
  })
})

// The same rules under a custom name must behave as the IANA zone does, every
// 15 minutes of a year, both ways, DST changes included
describe.each([
  {
    iana: 'Europe/Paris',
    lines: vtimezoneLines('Custom Paris')
  },
  {
    iana: 'America/New_York',
    lines: [
      'BEGIN:VTIMEZONE',
      'TZID:Custom Paris',
      'BEGIN:STANDARD',
      'DTSTART:16011104T020000',
      'TZOFFSETFROM:-0400',
      'TZOFFSETTO:-0500',
      'RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=11',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:16010311T020000',
      'TZOFFSETFROM:-0500',
      'TZOFFSETTO:-0400',
      'RRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3',
      'END:DAYLIGHT',
      'END:VTIMEZONE'
    ]
  },
  {
    iana: 'Australia/Sydney',
    lines: [
      'BEGIN:VTIMEZONE',
      'TZID:Custom Paris',
      'BEGIN:STANDARD',
      'DTSTART:16010401T030000',
      'TZOFFSETFROM:+1100',
      'TZOFFSETTO:+1000',
      'RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=4',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:16011001T020000',
      'TZOFFSETFROM:+1000',
      'TZOFFSETTO:+1100',
      'RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=10',
      'END:DAYLIGHT',
      'END:VTIMEZONE'
    ]
  }
])('a custom zone with the rules of $iana', ({ iana, lines }) => {
  const custom = 'Custom Paris'
  const vtimezones = [
    ICAL.parse(lines.join('\r\n')) as unknown as VCalComponent
  ]
  // Every 15 minutes within two days of the changes of 2025, every hour
  // otherwise
  const changeDays = [
    '2025-03-09',
    '2025-03-30',
    '2025-04-06',
    '2025-10-05',
    '2025-10-26',
    '2025-11-02'
  ].map(day => moment.utc(day).valueOf())
  const nearChange = (ms: number): boolean =>
    changeDays.some(day => Math.abs(ms - day) <= 2 * 24 * 3600 * 1000)
  const quarters = Array.from({ length: 366 * 24 * 4 }, (_, i) =>
    moment.utc('2025-01-01T00:00:00Z').add(i * 15, 'minutes')
  ).filter(m => m.minutes() === 0 || nearChange(m.valueOf()))

  it('reads every instant as the same wall clock', () => {
    const mismatches = withStoredTimezones(vtimezones, () =>
      quarters
        .map(instant => [
          instant.toISOString(),
          wallClockOf(instant, custom),
          wallClockOf(instant, iana)
        ])
        .filter(([, a, b]) => a !== b)
    )
    expect(mismatches).toEqual([])
  })

  it('reads every wall clock as the same instant', () => {
    const mismatches = withStoredTimezones(vtimezones, () =>
      quarters
        .map(quarter => quarter.format('YYYY-MM-DDTHH:mm:ss'))
        .map(wallClock => [
          wallClock,
          readWallClock(wallClock, custom).toISOString(),
          readWallClock(wallClock, iana).toISOString()
        ])
        .filter(([, a, b]) => a !== b)
    )
    expect(mismatches).toEqual([])
  })

  it('writes every instant as moment-timezone does', () => {
    const mismatches = withStoredTimezones(vtimezones, () =>
      quarters
        .map(instant => [
          instant.toISOString(),
          formatDateTimeToICal(instant.toDate(), custom),
          formatDateTimeToICal(instant.toDate(), iana)
        ])
        .filter(([, a, b]) => a !== b)
    )
    expect(mismatches).toEqual([])
  })

  it('converts every stored wall clock to the same ISO instant', () => {
    const mismatches = withStoredTimezones(vtimezones, () =>
      quarters
        .map(quarter => quarter.format('YYYY-MM-DDTHH:mm:ss'))
        .map(wallClock => [
          wallClock,
          convertEventDateTimeToISO(wallClock, custom),
          convertEventDateTimeToISO(wallClock, iana)
        ])
        .filter(([, a, b]) => a !== b)
    )
    expect(mismatches).toEqual([])
  })
})
