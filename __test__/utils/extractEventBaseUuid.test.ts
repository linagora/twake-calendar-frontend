import ICAL from 'ical.js'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { calendarEventToJCal } from '@common/features/Events/utils/calendarEventToJCal'
import { CalendarEvent } from '@common/types/EventsTypes'
import {
  extractCalendarOwnerId,
  extractEventBaseUuid,
  splitEventKey
} from '@common/utils/extractEventBaseUuid'

describe('splitEventKey', () => {
  it('keeps a plain uid whole', () => {
    expect(splitEventKey('abc-123')).toEqual({ baseUid: 'abc-123' })
  })

  it('keeps a uid holding "/" whole (#2064)', () => {
    expect(splitEventKey('invit/tion-1@example.com')).toEqual({
      baseUid: 'invit/tion-1@example.com'
    })
  })

  it.each([
    '2025-03-17T09:00:00Z',
    '2025-03-17T10:00:00',
    '20250317T090000Z',
    '2025-03-17',
    '20250317'
  ])('splits the occurrence key %s off a uid holding "/"', key => {
    expect(splitEventKey(`invit/tion-1@example.com/${key}`)).toEqual({
      baseUid: 'invit/tion-1@example.com',
      occurrenceKey: key
    })
  })

  it('returns an empty uid for an empty key', () => {
    expect(extractEventBaseUuid('')).toBe('')
  })
})

describe('extractCalendarOwnerId', () => {
  it('returns the owner part of a calendar id', () => {
    expect(extractCalendarOwnerId('user1/cal1')).toBe('user1')
  })
})

describe('event save round trip (#2064)', () => {
  const base = {
    calId: 'u1/cal1',
    URL: '/calendars/u1/cal1/event-1.ics',
    attendee: []
  } as unknown as CalendarEvent
  const ics = (uid: string) =>
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//test//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      'DTSTAMP:20250101T090000Z',
      'DTSTART;TZID=Europe/Paris:20250317T100000',
      'DTEND;TZID=Europe/Paris:20250317T110000',
      'SUMMARY:Project review',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

  it('writes back a UID holding a "/" unchanged', () => {
    const event = parseFetchedEvent(base, ics('invit/tion-1@example.com'), true)
    const vevent = new ICAL.Component(
      calendarEventToJCal(event)
    ).getFirstSubcomponent('vevent')!
    expect(vevent.getFirstPropertyValue('uid')).toBe('invit/tion-1@example.com')
  })
})
