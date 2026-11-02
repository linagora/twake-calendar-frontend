import { createEventContext } from '@common/features/Events/createEventContext'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { userData } from '@common/features/User/userDataTypes'
import { userAttendee } from '@common/features/User/models/attendee'
import { VObjectProperty } from '@common/features/Calendars/types/CalendarData'

const makeUser = (email: string): userData => ({
  email,
  given_name: 'Alice',
  family_name: 'User',
  name: 'Alice User',
  sid: 'user1',
  sub: 'user1'
})

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent =>
  ({
    uid: 'event-1',
    calId: 'user1/cal1',
    title: 'Test Event',
    start: '2024-01-15T10:00:00',
    end: '2024-01-15T11:00:00',
    organizer: { cal_address: 'alice@example.com' },

    attendee: [
      { cal_address: 'alice@example.com', partstat: 'ACCEPTED' },
      { cal_address: 'owner@example.com', partstat: 'ACCEPTED' },
      { cal_address: 'other@example.com', partstat: 'NEEDS-ACTION' }
    ],

    ...overrides
  }) as CalendarEvent

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar =>
  ({
    id: 'user1/cal1',
    name: 'Test Calendar',
    delegated: false,
    owner: { emails: ['alice@example.com'], firstname: 'Alice' },
    events: {},
    ...overrides
  }) as Calendar

describe('createEventContext', () => {
  describe('non-delegated calendar', () => {
    const calendar = makeCalendar({ delegated: false })
    const user = makeUser('alice@example.com')

    it('finds currentUserAttendee by logged-in user email', () => {
      const event = makeEvent()
      const ctx = createEventContext(event, calendar, user)
      expect(ctx.currentUserAttendee?.cal_address).toBe('alice@example.com')
    })

    it('finds currentUserAttendee listed with a padded address (#1886)', () => {
      const event = makeEvent({
        attendee: [
          { cal_address: 'mailto: Alice@Example.com', partstat: 'NEEDS-ACTION' }
        ] as CalendarEvent['attendee']
      })
      const ctx = createEventContext(event, calendar, user)
      expect(ctx.currentUserAttendee?.cal_address).toBe(
        'mailto: Alice@Example.com'
      )
    })

    it('prefers the row of the exact address to one differing by case', () => {
      const event = makeEvent({
        attendee: [
          { cal_address: 'Alice@example.com', partstat: 'DECLINED' },
          { cal_address: 'alice@example.com', partstat: 'ACCEPTED' }
        ] as CalendarEvent['attendee']
      })
      const ctx = createEventContext(event, calendar, user)
      expect(ctx.currentUserAttendee?.partstat).toBe('ACCEPTED')
    })

    it('returns null currentUserAttendee when user is not an attendee', () => {
      const event = makeEvent({ attendee: [] })
      const ctx = createEventContext(event, calendar, user)
      expect(ctx.currentUserAttendee).toBeUndefined()
    })

    it('isOwn is true when user email is in owner emails', () => {
      const ctx = createEventContext(makeEvent(), calendar, user)
      expect(ctx.isOwn).toBe(true)
    })

    it('isOwn is false when user email is not in owner emails', () => {
      const other = makeUser('other@example.com')
      const ctx = createEventContext(makeEvent(), calendar, other)
      expect(ctx.isOwn).toBe(false)
    })
  })

  describe('delegated calendar', () => {
    const calendar = makeCalendar({
      id: 'user2/cal1',
      delegated: true,
      owner: {
        emails: ['owner@example.com'],
        firstname: 'Owner',
        id: ''
      }
    })
    const user = makeUser('alice@example.com') // logged-in user, not the owner

    it('finds currentUserAttendee by owner email, not logged-in user email', () => {
      const event = makeEvent({ calId: 'user2/cal1' })
      const ctx = createEventContext(event, calendar, user)
      expect(ctx.currentUserAttendee?.cal_address).toBe('owner@example.com')
    })

    it('does not find logged-in user as attendee for delegated calendar', () => {
      const event = makeEvent({
        calId: 'user2/cal1',
        attendee: [
          {
            cal_address: 'owner@example.com',
            partstat: 'ACCEPTED'
          } as userAttendee
        ]
      })
      const ctx = createEventContext(event, calendar, user)
      // currentUserAttendee should be owner's, not alice's
      expect(ctx.currentUserAttendee?.cal_address).toBe('owner@example.com')
    })

    it('returns undefined currentUserAttendee when owner is not an attendee', () => {
      const event = makeEvent({
        calId: 'user2/cal1',
        attendee: [
          {
            cal_address: 'alice@example.com',
            partstat: 'ACCEPTED'
          } as userAttendee
        ]
      })
      const ctx = createEventContext(event, calendar, user)
      expect(ctx.currentUserAttendee).toBeUndefined()
    })

    it('passes event through unchanged', () => {
      const event = makeEvent({ calId: 'user2/cal1' })
      const ctx = createEventContext(event, calendar, user)
      expect(ctx.event).toBe(event)
    })
  })

  describe('team calendar', () => {
    const teamCalendar = makeCalendar({
      owner: {
        teamCalendar: true,
        emails: ['alice@example.com', 'bob@example.com']
      } as any
    })

    it('sets isOwn to true if calendar.owner.emails contains user.email', () => {
      const user = makeUser('alice@example.com')
      const ctx = createEventContext(makeEvent(), teamCalendar, user)
      expect(ctx.isOwn).toBe(true)
    })

    it('sets isOwn to false if calendar.owner.emails does not contain user.email', () => {
      const user = makeUser('charlie@example.com')
      const ctx = createEventContext(makeEvent(), teamCalendar, user)
      expect(ctx.isOwn).toBe(false)
    })

    it('sets isOrganizer to true if calendar.owner.emails contains event.organizer.cal_address', () => {
      const user = makeUser('charlie@example.com')
      const event = makeEvent({
        organizer: {
          cal_address: 'bob@example.com',
          cn: '',
          asMailto: function (): string {
            throw new Error('Function not implemented.')
          },
          asJcal: function (): VObjectProperty {
            throw new Error('Function not implemented.')
          }
        }
      })
      const ctx = createEventContext(event, teamCalendar, user)
      expect(ctx.isOrganizer).toBe(true)
    })

    it('sets isOrganizer to false if calendar.owner.emails does not contain event.organizer.cal_address', () => {
      const user = makeUser('charlie@example.com')
      const event = makeEvent({
        organizer: {
          cal_address: 'dave@example.com',
          cn: '',
          asMailto: function (): string {
            throw new Error('Function not implemented.')
          },
          asJcal: function (): VObjectProperty {
            throw new Error('Function not implemented.')
          }
        }
      })
      const ctx = createEventContext(event, teamCalendar, user)
      expect(ctx.isOrganizer).toBe(false)
    })

    it('finds currentUserAttendee by logged-in user email even if team calendar is delegated', () => {
      const delegatedTeamCalendar = makeCalendar({
        delegated: true,
        owner: {
          teamCalendar: true,
          emails: ['team@example.com']
        } as any
      })
      const user = makeUser('charlie@example.com')
      const event = makeEvent({
        attendee: [
          {
            cal_address: 'team@example.com',
            partstat: 'ACCEPTED',
            role: 'CHAIR',
            cutype: 'INDIVIDUAL',
            rsvp: 'TRUE',
            cn: '',
            withPartStat: function (): userAttendee {
              throw new Error('Function not implemented.')
            },
            withRsvp: function (): userAttendee {
              throw new Error('Function not implemented.')
            },
            asMailto: function (): string {
              throw new Error('Function not implemented.')
            },
            asJcal: function (): VObjectProperty {
              throw new Error('Function not implemented.')
            }
          },
          {
            cal_address: 'charlie@example.com',
            partstat: 'TENTATIVE',
            role: 'CHAIR',
            cutype: 'INDIVIDUAL',
            rsvp: 'TRUE',
            cn: '',
            withPartStat: function (): userAttendee {
              throw new Error('Function not implemented.')
            },
            withRsvp: function (): userAttendee {
              throw new Error('Function not implemented.')
            },
            asMailto: function (): string {
              throw new Error('Function not implemented.')
            },
            asJcal: function (): VObjectProperty {
              throw new Error('Function not implemented.')
            }
          }
        ]
      })
      const ctx = createEventContext(event, delegatedTeamCalendar, user)
      expect(ctx.currentUserAttendee?.cal_address).toBe('charlie@example.com')
      expect(ctx.currentUserAttendee?.partstat).toBe('TENTATIVE')
    })
  })
})
