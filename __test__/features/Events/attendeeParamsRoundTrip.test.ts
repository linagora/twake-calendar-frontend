import ICAL from 'ical.js'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { userAttendee } from '@common/features/User/models/attendee'
import { CalendarEvent } from '@common/types/EventsTypes'

const base = {
  calId: 'u1/cal1',
  URL: '/calendars/u1/cal1/event-1.ics',
  attendee: []
} as unknown as CalendarEvent

const ics = (attendees: string[]): string =>
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
    ...attendees,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

const writtenAttendees = (attendees: string[]): ICAL.Property[] => {
  const event = parseFetchedEvent(base, ics(attendees), true)
  return new ICAL.Component(calendarEventToJCal(event))
    .getFirstSubcomponent('vevent')!
    .getAllProperties('attendee')
}

describe('saving an event keeps the attendee parameters it does not model', () => {
  it('keeps the delegation parameters', () => {
    const [bob, carol] = writtenAttendees([
      'ATTENDEE;PARTSTAT=DELEGATED;DELEGATED-TO="mailto:carol@example.com":mailto:bob@example.com',
      'ATTENDEE;PARTSTAT=NEEDS-ACTION;DELEGATED-FROM="mailto:bob@example.com":mailto:carol@example.com'
    ])

    expect(bob.getParameter('delegated-to')).toBe('mailto:carol@example.com')
    expect(carol.getParameter('delegated-from')).toBe('mailto:bob@example.com')
  })

  it('keeps SENT-BY, LANGUAGE, SCHEDULE-STATUS and X- parameters', () => {
    const [bob] = writtenAttendees([
      'ATTENDEE;PARTSTAT=ACCEPTED;SENT-BY="mailto:dave@example.com";LANGUAGE=en;SCHEDULE-STATUS=1.2;X-FOO=bar:mailto:bob@example.com'
    ])

    expect(bob.getParameter('sent-by')).toBe('mailto:dave@example.com')
    expect(bob.getParameter('language')).toBe('en')
    expect(bob.getParameter('schedule-status')).toBe('1.2')
    expect(bob.getParameter('x-foo')).toBe('bar')
    expect(bob.getParameter('partstat')).toBe('ACCEPTED')
  })

  it('keeps them when the participation status changes', () => {
    const attendee = new userAttendee({
      cal_address: 'bob@example.com',
      otherParams: { language: 'en' }
    }).withPartStat('ACCEPTED')

    expect(attendee.asJcal()[1]).toMatchObject({
      partstat: 'ACCEPTED',
      language: 'en'
    })
  })

  it('does not let them override the modelled parameters', () => {
    const attendee = new userAttendee({
      cal_address: 'bob@example.com',
      partstat: 'ACCEPTED',
      otherParams: { partstat: 'DECLINED' }
    })

    expect(attendee.asJcal()[1].partstat).toBe('ACCEPTED')
  })
})
