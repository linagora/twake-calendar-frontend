import ICAL from 'ical.js'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { formatDateTimeToICal } from '@common/features/Events/utils/formatDateToICal'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  convertEventDateTimeToISO,
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
