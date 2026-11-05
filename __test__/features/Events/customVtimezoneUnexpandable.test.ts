import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  readWallClock,
  storedTimezone,
  wallClockOf,
  withStoredTimezones
} from '@common/utils/timezone'
import ICAL from 'ical.js'
import moment from 'moment-timezone'

const CUSTOM_ZONE = 'Customized Time Zone'

const icsWithObservance = (lines: string[]): string =>
  [
    'BEGIN:VCALENDAR',
    'BEGIN:VTIMEZONE',
    `TZID:${CUSTOM_ZONE}`,
    'BEGIN:STANDARD',
    ...lines,
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    'UID:event-uid-1',
    `DTSTART;TZID=${CUSTOM_ZONE}:20260908T100000`,
    `DTEND;TZID=${CUSTOM_ZONE}:20260908T110000`,
    'SUMMARY:Sync',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

const event = {
  uid: 'event-uid-1',
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-uid-1.ics',
  start: '',
  attendee: []
} as unknown as CalendarEvent

const vtimezonesOf = (jcal: VCalComponent): VCalComponent[] =>
  (jcal[2] as VCalComponent[]).filter(([name]) => name === 'vtimezone')

describe('a VTIMEZONE ical.js cannot expand', () => {
  const unexpandable: string[][] = [
    ['DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYYEARDAY=298'],
    ['DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYWEEKNO=43;BYMONTHDAY=25'],
    ['DTSTART:19701025T030000', 'RRULE:BYMONTH=10'],
    ['DTSTART:19701101TA20000']
  ]

  it.each(unexpandable)('leaves the event readable: %s %s', (...lines) => {
    const jcal = ICAL.parse(icsWithObservance(lines.filter(Boolean)))

    const parsed = parseFetchedEvent(event, jcal)

    expect(parsed.title).toBe('Sync')
    // Read like a TZID without a VTIMEZONE
    expect(new Date(parsed.start).toISOString()).toBe(
      '2026-09-08T10:00:00.000Z'
    )
    expect(new Date(parsed.end as string).toISOString()).toBe(
      '2026-09-08T11:00:00.000Z'
    )
  })

  it.each(unexpandable)('is not registered: %s %s', (...lines) => {
    const jcal = ICAL.parse(icsWithObservance(lines.filter(Boolean)))

    withStoredTimezones(vtimezonesOf(jcal), () => {
      expect(storedTimezone(CUSTOM_ZONE)).toBeUndefined()
    })
  })

  it('still registers a zone ical.js can expand', () => {
    const jcal = ICAL.parse(
      icsWithObservance([
        'DTSTART:19701025T030000',
        'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU'
      ])
    )

    withStoredTimezones(vtimezonesOf(jcal), () => {
      expect(storedTimezone(CUSTOM_ZONE)).toBeDefined()
    })
  })

  describe('only for a later year than the registration checks', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('reads the values as UTC instead of throwing', () => {
      const jcal = ICAL.parse(
        icsWithObservance([
          'DTSTART:19701025T030000',
          'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU'
        ])
      )

      withStoredTimezones(vtimezonesOf(jcal), () => {
        vi.spyOn(
          ICAL.Timezone.prototype as unknown as {
            _ensureCoverage: () => void
          },
          '_ensureCoverage'
        ).mockImplementation(() => {
          throw new Error('Invalid BYYEARDAY rule')
        })

        expect(
          readWallClock('2030-01-15T10:00:00', CUSTOM_ZONE).toISOString()
        ).toBe('2030-01-15T10:00:00.000Z')
        expect(
          wallClockOf(moment.utc('2030-01-15T10:00:00Z'), CUSTOM_ZONE)
        ).toBe('2030-01-15T10:00:00')
      })
    })
  })
})
