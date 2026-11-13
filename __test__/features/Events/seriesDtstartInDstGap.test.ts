import { resolveRepetition } from '@common/components/Event/utils/initialValues/recurrenceResolvers'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import ICAL from 'ical.js'

// America/St_Johns skips 02:00 -> 03:00 on 2030-03-10: 02:15 is in the gap
const ics = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//test//EN',
  'BEGIN:VEVENT',
  'UID:series-1',
  'DTSTAMP:20250101T000000Z',
  'DTSTART;TZID=America/St_Johns:20300310T021500',
  'DTEND;TZID=America/St_Johns:20300310T031500',
  'RRULE:FREQ=YEARLY;INTERVAL=3;BYMONTH=11;UNTIL=20310310T041500Z',
  'SUMMARY:Series',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n')

const writtenMaster = (
  edit: (master: CalendarEvent) => Partial<CalendarEvent>
): VCalComponent => {
  const jcal = ICAL.parse(ics) as VCalComponent
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
      repetition: RepetitionObject.fromFormValues(repetition, {
        allday: false,
        timezone: master.timezone
      }),
      ...edit(master)
    },
    { removeOverrides: false, followTimeChange: false, storedVtimezones: [] }
  )
  return (out[2] as VCalComponent[]).find(
    ([name]) => name === 'vevent'
  ) as VCalComponent
}

const valueOf = (vevent: VCalComponent, field: string): unknown =>
  vevent[1].find(([name]) => name === field)?.[3]

describe('series with a DTSTART in a DST gap', () => {
  it('keeps the stored DTSTART and DTEND when the series is renamed', () => {
    const written = writtenMaster(() => ({ title: 'Renamed' }))

    expect(valueOf(written, 'dtstart')).toBe('2030-03-10T02:15:00')
    expect(valueOf(written, 'dtend')).toBe('2030-03-10T03:15:00')
    expect(valueOf(written, 'summary')).toBe('Renamed')
  })

  it('writes the new start when the series is moved', () => {
    const written = writtenMaster(() => ({
      start: '2030-03-10T08:15:00.000Z',
      end: '2030-03-10T09:15:00.000Z'
    }))

    // 08:15Z is 05:45 NDT
    expect(valueOf(written, 'dtstart')).toBe('2030-03-10T05:45:00')
    expect(valueOf(written, 'dtend')).toBe('2030-03-10T06:45:00')
  })
})
