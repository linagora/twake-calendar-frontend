import ICAL from 'ical.js'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'

// A series with a floating DTSTART next to a custom VTIMEZONE: the client reads
// it in that VTIMEZONE, so the shift of an "All the events" edit is measured
// there, not as UTC. See #2106.
const TZID = 'Customized Time Zone'
const ics = [
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
  'DTSTART:20251013T100000',
  'DTEND:20251013T110000',
  'RRULE:FREQ=WEEKLY;COUNT=5',
  'EXDATE:20251027T100000',
  'SUMMARY:Weekly',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:series-1',
  'DTSTAMP:20250101T000000Z',
  'RECURRENCE-ID:20251020T100000',
  'DTSTART:20251020T100000',
  'DTEND:20251020T110000',
  'SUMMARY:Own title',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n')

describe('series with a floating DTSTART and a custom VTIMEZONE', () => {
  const vcal = ICAL.parse(ics) as VCalComponent
  const vevents = vcal[2].filter(([n]) => n === 'vevent')
  const storedVtimezones = vcal[2].filter(([n]) => n === 'vtimezone')
  const stub = {
    uid: 'series-1',
    calId: 'u/c',
    URL: '/c/series-1.ics',
    attendee: []
  } as unknown as CalendarEvent
  const master = parseFetchedEvent(stub, vcal, true)
  const override = (jCal: VCalComponent): VCalComponent =>
    jCal[2].find(
      ([n, p]) => n === 'vevent' && p.some(([k]) => k === 'recurrence-id')
    )!
  const seriesMaster = (jCal: VCalComponent): VCalComponent =>
    jCal[2].find(
      ([n, p]) => n === 'vevent' && !p.some(([k]) => k === 'recurrence-id')
    )!
  const valueOf = (v: VCalComponent, name: string): unknown =>
    v[1].find(([k]) => k === name)?.[3]

  afterEach(() => {
    // No test may leak the custom zone into the global registry
    expect(ICAL.TimezoneService.has(TZID)).toBe(false)
  })

  it('reads the series at 10:00 in its VTIMEZONE', () => {
    expect(master.start).toBe('2025-10-13T09:00:00.000Z')
    expect(master.timezone).toBe(TZID)
  })

  it('moves the override and the EXDATE by one hour with the series', () => {
    const jCal = makeSeriesJCal(
      vevents,
      {
        ...master,
        start: '2025-10-13T10:00:00.000Z',
        end: '2025-10-13T11:00:00.000Z'
      },
      { removeOverrides: false, followTimeChange: true, storedVtimezones }
    )
    expect(valueOf(override(jCal), 'recurrence-id')).toBe('2025-10-20T11:00:00')
    expect(valueOf(seriesMaster(jCal), 'exdate')).toBe('2025-10-27T11:00:00')
  })

  it('leaves the override and the EXDATE in place when the time is unchanged', () => {
    const jCal = makeSeriesJCal(vevents, master, {
      removeOverrides: false,
      followTimeChange: true,
      storedVtimezones
    })
    expect(valueOf(override(jCal), 'recurrence-id')).toBe('2025-10-20T10:00:00')
    expect(valueOf(seriesMaster(jCal), 'exdate')).toBe('2025-10-27T10:00:00')
  })
})
