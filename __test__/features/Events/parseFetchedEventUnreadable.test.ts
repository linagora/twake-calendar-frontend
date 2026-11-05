import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import ICAL from 'ical.js'

const event = {
  uid: 'event-uid-1',
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-uid-1.ics',
  start: '',
  attendee: []
} as unknown as CalendarEvent

const ICS_WITHOUT_FREQ = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:event-uid-1',
  'DTSTART:20260908T080000Z',
  'DTEND:20260908T083000Z',
  'RRULE:COUNT=6',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n')

describe('an RRULE without FREQ', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('leaves the event readable, without a repetition', () => {
    const parsed = parseFetchedEvent(event, ICAL.parse(ICS_WITHOUT_FREQ))

    expect(parsed.start).toBe('2026-09-08T08:00:00Z')
    expect(parsed.end).toBe('2026-09-08T08:30:00Z')
    expect(parsed.repetition).toBeUndefined()
  })

  it('gives way to the rule of the form on a series edit', () => {
    const jcal = ICAL.parse(ICS_WITHOUT_FREQ) as VCalComponent
    const vevents = (jcal[2] as VCalComponent[]).filter(
      ([name]) => name === 'vevent'
    )

    const out = makeSeriesJCal(
      vevents,
      {
        ...event,
        title: 'Now weekly',
        start: '2026-09-08T08:00:00.000Z',
        end: '2026-09-08T08:30:00.000Z',
        timezone: 'UTC',
        repetition: new RepetitionObject({ freq: 'weekly', interval: 1 })
      } as CalendarEvent,
      { removeOverrides: true }
    )

    const master = (out[2] as VCalComponent[]).find(
      ([name]) => name === 'vevent'
    ) as VCalComponent
    const rrule = master[1].find(([name]) => name === 'rrule')
    expect((rrule?.[3] as unknown as { freq: string }).freq).toBe('weekly')
  })
})
