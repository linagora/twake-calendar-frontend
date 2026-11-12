import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { CalendarEvent } from '@common/types/EventsTypes'
import ICAL from 'ical.js'

const base = {
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  attendee: []
} as unknown as CalendarEvent

const ics = (extra: string): string =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//test//EN',
    'BEGIN:VEVENT',
    'UID:event-1@example.com',
    'DTSTAMP:20250101T090000Z',
    'DTSTART;TZID=Europe/Paris:20250317T100000',
    'DTEND;TZID=Europe/Paris:20250317T110000',
    'SEQUENCE:2',
    'SUMMARY:Project review',
    extra,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

const writtenVevent = (event: CalendarEvent): ICAL.Component =>
  new ICAL.Component(calendarEventToJCal(event)).getFirstSubcomponent('vevent')!

describe('STATUS of an event saved by Twake Calendar', () => {
  it.each(['CANCELLED', 'TENTATIVE', 'CONFIRMED'])(
    'writes STATUS:%s back as read',
    status => {
      const event = parseFetchedEvent(base, ics(`STATUS:${status}`), true)

      const vevent = writtenVevent(event)

      expect(vevent.getAllProperties('status')).toHaveLength(1)
      expect(vevent.getFirstPropertyValue('status')).toBe(status)
    }
  )

  it('writes no STATUS when the event had none', () => {
    const event = parseFetchedEvent(base, ics('LOCATION:Room 1'), true)

    expect(writtenVevent(event).getFirstPropertyValue('status')).toBeNull()
  })
})
