import ICAL from 'ical.js'
import moment from 'moment-timezone'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import {
  formatDateTimeToICal,
  formatUntilForRRule
} from '@common/features/Events/utils/formatDateToICal'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  convertEventDateTimeToISO,
  wallClockOf,
  withStoredTimezones
} from '@common/utils/timezone'

// A TZID only defined by the VTIMEZONE of the object (Outlook's "Customized
// Time Zone") must be read and written with that VTIMEZONE. See #1941.
const TZID = 'Customized Time Zone'

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//test//EN',
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0100',
  'END:STANDARD',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'UID:series-1',
  'DTSTAMP:20250101T000000Z',
  `DTSTART;TZID=${TZID}:20250818T100000`,
  `DTEND;TZID=${TZID}:20250818T110000`,
  'RRULE:FREQ=WEEKLY;COUNT=5',
  'SUMMARY:Weekly sync',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n')

const components = (jcal: VCalComponent, name: string): VCalComponent[] =>
  (jcal[2] ?? []).filter(([n]) => n === name)

describe('a series in a zone only defined by its VTIMEZONE', () => {
  it('is read at the instant the VTIMEZONE defines', () => {
    const master = parseFetchedEvent(
      { calId: 'user/cal' } as CalendarEvent,
      ICAL.parse(ICS) as VCalComponent,
      true
    )

    expect(master.timezone).toBe(TZID)
    expect(new Date(master.start).toISOString()).toBe(
      '2025-08-18T09:00:00.000Z'
    )
    expect(new Date(master.end as string).toISOString()).toBe(
      '2025-08-18T10:00:00.000Z'
    )
  })

  it('keeps its TZID, wall clock and VTIMEZONE on an "All the events" edit', () => {
    const jcal = ICAL.parse(ICS) as VCalComponent
    const master = parseFetchedEvent(
      { calId: 'user/cal' } as CalendarEvent,
      jcal,
      true
    )

    const out = makeSeriesJCal(
      components(jcal, 'vevent'),
      { ...master, title: 'Renamed', uid: 'series-1' },
      {
        removeOverrides: false,
        storedVtimezones: components(jcal, 'vtimezone')
      }
    )

    const calendar = new ICAL.Component(out as unknown[])
    const vevent = calendar.getFirstSubcomponent('vevent') as ICAL.Component
    const dtstart = vevent.getFirstProperty('dtstart') as ICAL.Property
    expect(dtstart.getParameter('tzid')).toBe(TZID)
    expect(dtstart.toJSON()[3]).toBe('2025-08-18T10:00:00')
    expect(
      calendar
        .getAllSubcomponents('vtimezone')
        .map(vtimezone => vtimezone.getFirstPropertyValue('tzid'))
    ).toEqual([TZID])

    calendar
      .getAllSubcomponents('vtimezone')
      .forEach(vtimezone =>
        ICAL.TimezoneService.register(new ICAL.Timezone(vtimezone), TZID)
      )
    try {
      expect(new ICAL.Event(vevent).startDate.toUnixTime()).toBe(
        Date.parse('2025-08-18T09:00:00Z') / 1000
      )
    } finally {
      ICAL.TimezoneService.remove(TZID)
    }
  })
})

describe('a UTC series next to a custom VTIMEZONE', () => {
  const UTC_ICS = ICS.replace(
    `DTSTART;TZID=${TZID}:20250818T100000`,
    'DTSTART:20250818T090000Z'
  ).replace(`DTEND;TZID=${TZID}:20250818T110000`, 'DTEND:20250818T100000Z')

  it('stays in UTC', () => {
    const master = parseFetchedEvent(
      { calId: 'user/cal' } as CalendarEvent,
      ICAL.parse(UTC_ICS) as VCalComponent,
      true
    )

    expect(master.timezone).toBe('UTC')
    expect(new Date(master.start).toISOString()).toBe(
      '2025-08-18T09:00:00.000Z'
    )
  })

  it('keeps a UTC wall clock on an "All the events" edit', () => {
    const jcal = ICAL.parse(UTC_ICS) as VCalComponent
    const master = parseFetchedEvent(
      { calId: 'user/cal' } as CalendarEvent,
      jcal,
      true
    )

    const out = makeSeriesJCal(
      components(jcal, 'vevent'),
      { ...master, title: 'Renamed', uid: 'series-1' },
      {
        removeOverrides: false,
        storedVtimezones: components(jcal, 'vtimezone')
      }
    )

    const vevent = new ICAL.Component(out as unknown[]).getFirstSubcomponent(
      'vevent'
    ) as ICAL.Component
    const dtstart = vevent.getFirstProperty('dtstart') as ICAL.Property
    expect(dtstart.getParameter('tzid')).toBe('UTC')
    expect(dtstart.toJSON()[3]).toBe('2025-08-18T09:00:00')
  })
})

describe('the end date of a series in a custom zone', () => {
  const vtimezones = components(ICAL.parse(ICS) as VCalComponent, 'vtimezone')

  it('ends at the end of that day in the stored zone', () => {
    expect(
      withStoredTimezones(vtimezones, () =>
        formatUntilForRRule('2025-09-15', false, TZID)
      )
    ).toBe('20250915T225959Z')
  })

  it('reads a floating DATE-TIME end in the stored zone', () => {
    expect(
      withStoredTimezones(vtimezones, () =>
        formatUntilForRRule('2025-09-15T10:00:00', false, TZID)
      )
    ).toBe('20250915T090000Z')
  })
})

describe('a stored zone without the expected ical.js internals', () => {
  const NAME = 'Zone with renamed internals'

  it('falls back to the public utcOffset API', () => {
    const zone = Object.create(ICAL.Timezone.prototype) as ICAL.Timezone
    Object.assign(zone, { utcOffset: () => 3600 })
    ICAL.TimezoneService.register(zone, NAME)
    try {
      expect(wallClockOf(moment.utc('2025-08-18T09:00:00Z'), NAME)).toBe(
        '2025-08-18T10:00:00'
      )
    } finally {
      ICAL.TimezoneService.remove(NAME)
    }
  })
})

describe('withStoredTimezones', () => {
  const vtimezones = components(ICAL.parse(ICS) as VCalComponent, 'vtimezone')

  it('knows the custom zone during the call only', () => {
    withStoredTimezones(vtimezones, () => {
      expect(ICAL.TimezoneService.has(TZID)).toBe(true)
    })
    expect(ICAL.TimezoneService.has(TZID)).toBe(false)
  })

  it('leaves the custom zone written as UTC outside of the call', () => {
    const instant = new Date('2025-08-18T09:00:00Z')
    expect(
      withStoredTimezones(vtimezones, () => formatDateTimeToICal(instant, TZID))
    ).toBe('2025-08-18T10:00:00')
    expect(formatDateTimeToICal(instant, TZID)).toBe('2025-08-18T09:00:00Z')
    expect(convertEventDateTimeToISO('2025-08-18T10:00:00', TZID)).toBe(
      '2025-08-18T10:00:00.000Z'
    )
  })

  it('does not replace a known zone', () => {
    const paris = vtimezones.map(([name, props, subs]) => [
      name,
      props.map(prop =>
        prop[0] === 'tzid' ? ['tzid', {}, 'text', 'Europe/Paris'] : prop
      ),
      subs
    ]) as VCalComponent[]
    expect(
      withStoredTimezones(paris, () =>
        convertEventDateTimeToISO('2025-08-18T10:00:00', 'Europe/Paris')
      )
    ).toBe('2025-08-18T08:00:00.000Z')
  })
})
