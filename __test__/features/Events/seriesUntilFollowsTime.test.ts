import { resolveRepetition } from '@common/components/Event/utils/initialValues/recurrenceResolvers'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import ICAL from 'ical.js'

const icsWithUntil = (until: string): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    'BEGIN:VEVENT',
    'UID:series-1',
    'DTSTAMP:20250101T000000Z',
    'DTSTART;TZID=Europe/Paris:20261006T090000',
    'DTEND;TZID=Europe/Paris:20261006T100000',
    `RRULE:FREQ=WEEKLY;UNTIL=${until}`,
    'SUMMARY:Weekly sync',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

const writtenUntil = (until: string, start: string, end: string): string => {
  const jcal = ICAL.parse(icsWithUntil(until)) as VCalComponent
  const master = parseFetchedEvent(
    { calId: 'user/cal' } as CalendarEvent,
    jcal,
    true
  )
  const { repetition } = resolveRepetition(master, master.calId, {})
  const vevents = (jcal[2] as VCalComponent[]).filter(
    ([name]) => name === 'vevent'
  )

  const out = makeSeriesJCal(
    vevents,
    {
      ...master,
      uid: 'series-1',
      start,
      end,
      repetition: RepetitionObject.fromFormValues(repetition, {
        allday: false,
        timezone: 'Europe/Paris'
      })
    },
    { removeOverrides: false, followTimeChange: true, storedVtimezones: [] }
  )

  const written = (out[2] as VCalComponent[]).find(
    ([name]) => name === 'vevent'
  ) as VCalComponent
  const rrule = written[1].find(([name]) => name === 'rrule')
  const value = rrule?.[3] as unknown as { until: string }
  return String(value.until).replace(/[-:]/g, '')
}

describe('the DATE-TIME UNTIL of a series moved to another time of day', () => {
  // 2026-10-06 in Paris is UTC+2
  it('moves later with the series, keeping the last occurrence', () => {
    expect(
      writtenUntil(
        '20261027T080000Z',
        '2026-10-06T08:00:00.000Z',
        '2026-10-06T09:00:00.000Z'
      )
    ).toBe('20261027T090000Z')
  })

  it('moves earlier with the series, not letting in the next occurrence', () => {
    expect(
      writtenUntil(
        '20261027T080000Z',
        '2026-10-06T06:00:00.000Z',
        '2026-10-06T07:00:00.000Z'
      )
    ).toBe('20261027T070000Z')
  })

  it('stays when the time of day does not change', () => {
    expect(
      writtenUntil(
        '20261027T080000Z',
        '2026-10-06T07:00:00.000Z',
        '2026-10-06T08:00:00.000Z'
      )
    ).toBe('20261027T080000Z')
  })

  it('stays at the end of the day the form writes for a picked date', () => {
    // 23:59:59 in Paris, UTC+1 after the end of summer time
    expect(
      writtenUntil(
        '20261027T225959Z',
        '2026-10-06T08:00:00.000Z',
        '2026-10-06T09:00:00.000Z'
      )
    ).toBe('20261027T225959Z')
  })

  it('stays when the series moves to another day', () => {
    expect(
      writtenUntil(
        '20261027T080000Z',
        '2026-10-07T08:00:00.000Z',
        '2026-10-07T09:00:00.000Z'
      )
    ).toBe('20261027T080000Z')
  })
})

describe('the DATE-TIME UNTIL of a series in a zone only its VTIMEZONE defines', () => {
  it('moves by the wall clock amount read with that VTIMEZONE', () => {
    const jcal = ICAL.parse(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//test//EN',
        'BEGIN:VTIMEZONE',
        'TZID:Customized Time Zone',
        'BEGIN:STANDARD',
        'DTSTART:19700101T000000',
        'TZOFFSETFROM:-0500',
        'TZOFFSETTO:-0500',
        'END:STANDARD',
        'END:VTIMEZONE',
        'BEGIN:VEVENT',
        'UID:series-1',
        'DTSTAMP:20250101T000000Z',
        'DTSTART;TZID=Customized Time Zone:20261006T090000',
        'DTEND;TZID=Customized Time Zone:20261006T100000',
        'RRULE:FREQ=WEEKLY;UNTIL=20261027T140000Z',
        'SUMMARY:Weekly sync',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n')
    ) as VCalComponent
    const master = parseFetchedEvent(
      { calId: 'user/cal' } as CalendarEvent,
      jcal,
      true
    )
    const { repetition } = resolveRepetition(master, master.calId, {})
    const components = jcal[2] as VCalComponent[]

    const out = makeSeriesJCal(
      components.filter(([name]) => name === 'vevent'),
      {
        ...master,
        uid: 'series-1',
        start: '2026-10-06T15:00:00.000Z',
        end: '2026-10-06T16:00:00.000Z',
        repetition: RepetitionObject.fromFormValues(repetition, {
          allday: false,
          timezone: master.timezone
        })
      },
      {
        removeOverrides: false,
        followTimeChange: true,
        storedVtimezones: components.filter(([name]) => name === 'vtimezone')
      }
    )

    const written = (out[2] as VCalComponent[]).find(
      ([name]) => name === 'vevent'
    ) as VCalComponent
    const rrule = written[1].find(([name]) => name === 'rrule')
    const value = rrule?.[3] as unknown as { until: string }
    expect(String(value.until).replace(/[-:]/g, '')).toBe('20261027T150000Z')
  })
})
