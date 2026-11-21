import {
  createdEvent,
  isNewEventIntent,
  parseNewEventData
} from '@common/features/intents/newEventIntent'
import { userAttendee } from '@common/features/User/models/attendee'
import type { CalendarEvent } from '@common/types/EventsTypes'

// Twake Chat asks for a new event with the members of a room:
// intents.create('CREATE', 'io.cozy.calendar.events', { attendees })
describe('the intent of a new event', () => {
  it('is CREATE io.cozy.calendar.events, the action in any case', () => {
    expect(isNewEventIntent('CREATE', 'io.cozy.calendar.events')).toBe(true)
    expect(isNewEventIntent('create', 'io.cozy.calendar.events')).toBe(true)
  })

  it('is no other action or type', () => {
    expect(isNewEventIntent('OPEN', 'io.cozy.calendar.events')).toBe(false)
    expect(isNewEventIntent('PICK', 'io.cozy.files')).toBe(false)
    expect(isNewEventIntent('CREATE', 'io.cozy.mails')).toBe(false)
    expect(isNewEventIntent('CREATE', 'io.cozy.calendar.event')).toBe(false)
  })
})

describe('the data the client sends with the intent', () => {
  it('reads the attendees, trimmed, the empty ones dropped', () => {
    expect(
      parseNewEventData({
        attendees: [' alice@example.com ', 'bob@example.com', '', '   ']
      })
    ).toEqual({ attendees: ['alice@example.com', 'bob@example.com'] })
  })

  it('opens an event without attendees when the client names none', () => {
    expect(parseNewEventData({})).toEqual({ attendees: [] })
    expect(parseNewEventData({ attendees: [] })).toEqual({ attendees: [] })
    expect(parseNewEventData(null)).toEqual({ attendees: [] })
    expect(parseNewEventData(undefined)).toEqual({ attendees: [] })
  })

  it('refuses data of another shape', () => {
    expect(parseNewEventData('alice@example.com')).toBe(null)
    expect(parseNewEventData(['alice@example.com'])).toBe(null)
    expect(parseNewEventData({ attendees: 'alice@example.com' })).toBe(null)
    expect(parseNewEventData({ attendees: [42] })).toBe(null)
    expect(parseNewEventData({ attendees: ['alice@example.com', null] })).toBe(
      null
    )
  })
})

describe('the event the client gets back', () => {
  const savedEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent =>
    ({
      uid: '0b8f6c1e-2d4a-4e8b-9f7a-1c2d3e4f5a6b',
      calId: 'user1/user1',
      title: 'Weekly sync',
      start: '2026-11-09T10:00:00.000Z',
      end: '2026-11-09T10:30:00.000Z',
      allday: false,
      timezone: 'Europe/Paris',
      x_openpass_videoconference: 'https://meet.test/abc-defg-hij',
      ...overrides
    }) as CalendarEvent

  it('has its time, its video conference and its link in the calendar', () => {
    expect(createdEvent(savedEvent())).toEqual({
      uid: '0b8f6c1e-2d4a-4e8b-9f7a-1c2d3e4f5a6b',
      title: 'Weekly sync',
      start: '2026-11-09T10:00:00.000Z',
      end: '2026-11-09T10:30:00.000Z',
      allDay: false,
      timeZone: 'Europe/Paris',
      videoConferenceUrl: 'https://meet.test/abc-defg-hij',
      // The deep link of the event in the calendar (/events/:uid)
      url: `${window.location.origin}/events/0b8f6c1e-2d4a-4e8b-9f7a-1c2d3e4f5a6b`,
      attendees: []
    })
  })

  // As the form saves them: the organizer first (CHAIR), the resources, then
  // the people the user invited
  const organizer = new userAttendee({
    cal_address: 'alice@example.com',
    cn: 'Alice Martin',
    partstat: 'ACCEPTED',
    role: 'CHAIR'
  })
  const bob = new userAttendee({ cal_address: 'bob@example.com', cn: 'Bob' })

  it('has every attendee of the saved event, the organizer included, with their name', () => {
    expect(
      createdEvent(savedEvent({ attendee: [organizer, bob] })).attendees
    ).toEqual([
      { email: 'alice@example.com', name: 'Alice Martin' },
      { email: 'bob@example.com', name: 'Bob' }
    ])
  })

  it('leaves out the rooms and equipment booked with the event, as the calendar counts its participants', () => {
    const room = new userAttendee({
      cal_address: 'room-4@resources.example.com',
      cn: 'Room 4',
      cutype: 'RESOURCE'
    })

    expect(
      createdEvent(savedEvent({ attendee: [organizer, room, bob] })).attendees
    ).toEqual([
      { email: 'alice@example.com', name: 'Alice Martin' },
      { email: 'bob@example.com', name: 'Bob' }
    ])
  })

  it('says an attendee without a name has none', () => {
    const carol = new userAttendee({ cal_address: 'carol@example.com', cn: '' })

    expect(
      createdEvent(savedEvent({ attendee: [organizer, carol] })).attendees
    ).toContainEqual({ email: 'carol@example.com', name: null })
  })

  it('gives the e-mail address of an attendee stored as a mailto: URI', () => {
    const dave = new userAttendee({
      cal_address: 'mailto:dave@example.com',
      cn: 'Dave'
    })

    expect(
      createdEvent(savedEvent({ attendee: [organizer, dave] })).attendees
    ).toContainEqual({ email: 'dave@example.com', name: 'Dave' })
  })

  it('says an event without a video conference has none', () => {
    expect(
      createdEvent(savedEvent({ x_openpass_videoconference: undefined }))
        .videoConferenceUrl
    ).toBeNull()
  })

  it('says whether the event lasts all day', () => {
    expect(createdEvent(savedEvent({ allday: true })).allDay).toBe(true)
  })

  it('gives an untitled event an empty title, and one that does not say it lasts all day a time', () => {
    const event = createdEvent(
      savedEvent({ title: undefined, allday: undefined })
    )
    expect(event.title).toBe('')
    expect(event.allDay).toBe(false)
  })
})
