import ICAL from 'ical.js'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { CalendarEvent } from '@common/types/EventsTypes'

const base = {
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  attendee: []
} as unknown as CalendarEvent

const ics = (...dates: string[]): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    'BEGIN:VEVENT',
    'UID:event-1@example.com',
    'DTSTAMP:20250101T090000Z',
    ...dates,
    'SUMMARY:Deadline',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

const DTSTART = 'DTSTART;TZID=Europe/Paris:20250317T100000'

const writtenVevent = (event: CalendarEvent): ICAL.Component =>
  new ICAL.Component(calendarEventToJCal(event)).getFirstSubcomponent('vevent')!

describe('a timed event without DTEND nor DURATION (RFC 5545 §3.6.1)', () => {
  it('is still displayed with a 30-minute end', () => {
    const parsed = parseFetchedEvent(base, ics(DTSTART), true)

    expect(new Date(parsed.end as string).toISOString()).toBe(
      '2025-03-17T09:30:00.000Z'
    )
  })

  it('is saved without DTEND while its dates are untouched', () => {
    const parsed = parseFetchedEvent(base, ics(DTSTART), true)

    const vevent = writtenVevent(parsed)

    expect(vevent.getFirstProperty('dtend')).toBeNull()
    expect(vevent.getFirstProperty('dtstart')!.toJSON()[3]).toBe(
      '2025-03-17T10:00:00'
    )
  })

  it('is saved without DTEND when its dates are only reformatted', () => {
    const parsed = parseFetchedEvent(base, ics(DTSTART), true)

    const vevent = writtenVevent({
      ...parsed,
      start: new Date(parsed.start).toISOString(),
      end: new Date(parsed.end as string).toISOString()
    })

    expect(vevent.getFirstProperty('dtend')).toBeNull()
  })

  it('gets a DTEND once the user moves it', () => {
    const parsed = parseFetchedEvent(base, ics(DTSTART), true)

    const vevent = writtenVevent({
      ...parsed,
      start: '2025-03-17T10:00:00.000Z',
      end: '2025-03-17T10:30:00.000Z'
    })

    expect(vevent.getFirstProperty('dtend')!.toJSON()[3]).toBe(
      '2025-03-17T11:30:00'
    )
  })

  it('gets a DTEND once the user changes its end', () => {
    const parsed = parseFetchedEvent(base, ics(DTSTART), true)

    const vevent = writtenVevent({ ...parsed, end: '2025-03-17T10:00:00.000Z' })

    expect(vevent.getFirstProperty('dtend')!.toJSON()[3]).toBe(
      '2025-03-17T11:00:00'
    )
  })
})

describe('the DTEND of a saved event', () => {
  it('is kept when it was stored', () => {
    const parsed = parseFetchedEvent(
      base,
      ics(DTSTART, 'DTEND;TZID=Europe/Paris:20250317T103000'),
      true
    )

    expect(parsed.implicitEnd).toBeUndefined()
    expect(writtenVevent(parsed).getFirstProperty('dtend')!.toJSON()[3]).toBe(
      '2025-03-17T10:30:00'
    )
  })

  it('is written for an all-day event stored without one', () => {
    const parsed = parseFetchedEvent(
      base,
      ics('DTSTART;VALUE=DATE:20250317'),
      true
    )

    expect(parsed.implicitEnd).toBeUndefined()
    expect(writtenVevent(parsed).getFirstProperty('dtend')!.toJSON()[3]).toBe(
      '2025-03-18'
    )
  })
})
