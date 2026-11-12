import ICAL from 'ical.js'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { CalendarEvent } from '@common/types/EventsTypes'

const base = {
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  attendee: []
} as unknown as CalendarEvent

const ics = (extra: string) =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    'BEGIN:VEVENT',
    'UID:event-1@example.com',
    'DTSTAMP:20250101T090000Z',
    'DTSTART;TZID=Europe/Paris:20250317T100000',
    'DTEND;TZID=Europe/Paris:20250317T110000',
    'SUMMARY:Project review',
    extra,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

function savedVevent(event: CalendarEvent): ICAL.Component {
  return new ICAL.Component(calendarEventToJCal(event)).getFirstSubcomponent(
    'vevent'
  )!
}

describe('X-OPENPAAS-BOOKING-LINK round-trip (#2061)', () => {
  it('keeps the booking link of a booked event', () => {
    const event = parseFetchedEvent(
      base,
      ics('X-OPENPAAS-BOOKING-LINK:booking-1234'),
      true
    )

    expect(event.bookingLinkPublicId).toBe('booking-1234')
    expect(
      savedVevent(event).getFirstPropertyValue('x-openpaas-booking-link')
    ).toBe('booking-1234')
  })

  it('writes the booking link exactly once', () => {
    const event = parseFetchedEvent(
      base,
      ics('X-OPENPAAS-BOOKING-LINK:booking-1234'),
      true
    )

    expect(
      savedVevent(event).getAllProperties('x-openpaas-booking-link')
    ).toHaveLength(1)
  })

  it('writes no booking link for an event that has none', () => {
    const event = parseFetchedEvent(base, ics('LOCATION:Room 1'), true)

    expect(event.bookingLinkPublicId).toBeUndefined()
    expect(
      savedVevent(event).getFirstProperty('x-openpaas-booking-link')
    ).toBeNull()
  })
})
