import { Calendar } from '@common/types/CalendarTypes'
import { AttendanceValidation } from '@common/features/Events/AttendanceValidation/AttendanceValidation'
import { ContextualizedEvent } from '@common/types/EventsTypes'
import { userAttendee } from '@common/features/User/models/attendee'
import { userData } from '@common/features/User/userDataTypes'
import { render } from '@testing-library/react'

vi.mock('twake-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

vi.mock('@common/app/hooks', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: vi.fn()
}))

const makeUser = (email: string): userData => ({
  email,
  given_name: 'Alice',
  family_name: 'User',
  name: 'Alice User',
  sid: 'user1',
  sub: 'user1'
})

const makeContext = (
  overrides: Partial<ContextualizedEvent> = {}
): ContextualizedEvent =>
  ({
    event: {
      uid: 'event-1',
      calId: 'user1/cal1',
      title: 'Test',
      start: '2024-01-15T10:00:00',
      end: '2024-01-15T11:00:00',
      organizer: { cal_address: 'owner@example.com' },
      attendee: [{ cal_address: 'owner@example.com', partstat: 'NEEDS-ACTION' }]
    },
    calendar: {
      id: 'user1/cal1',
      name: 'Test',
      delegated: false,
      owner: { emails: ['alice@example.com'] },
      events: {}
    },
    currentUserAttendee: {
      cal_address: 'alice@example.com',
      partstat: 'NEEDS-ACTION'
    },
    isOwn: true,
    isOrganizer: false,
    isRecurring: false,
    ...overrides
  }) as unknown as ContextualizedEvent

const noopSetFunc = vi.fn()

describe('AttendanceValidation - delegation', () => {
  describe('non-delegated calendar', () => {
    it('renders when isOwn and currentUserAttendee exists', () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={makeContext({ isOwn: true })}
          user={makeUser('alice@example.com')}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(container.firstChild).not.toBeNull()
    })

    it('returns null when not isOwn but currentUserAttendee exists', () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={makeContext({ isOwn: false })}
          user={makeUser('other@example.com')}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('returns null when not isOwn, not delegated, and not an attendee', () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={makeContext({
            isOwn: false,
            currentUserAttendee: undefined
          })}
          user={makeUser('other@example.com')}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('delegated calendar', () => {
    const delegatedContext = makeContext({
      isOwn: false, // logged-in user is not the owner
      calendar: {
        id: 'user2/cal1',
        name: 'Delegated Cal',
        delegated: true,
        access: { read: true, write: true },
        owner: {
          emails: ['owner@example.com'],
          firstname: 'Olivia',
          lastname: 'Owner'
        },
        events: {}
      } as Calendar,
      currentUserAttendee: {
        cal_address: 'owner@example.com',
        partstat: 'NEEDS-ACTION'
      } as userAttendee,
      event: { class: 'PUBLIC' }
    })

    it('renders even when isOwn is false', () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={delegatedContext}
          user={makeUser('alice@example.com')}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(container.firstChild).not.toBeNull()
    })

    it('renders regardless of currentUserAttendee presence', () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={{
            ...delegatedContext,
            currentUserAttendee: undefined
          }}
          user={makeUser('alice@example.com')}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      // write delegation alone should keep it visible
      expect(container.firstChild).not.toBeNull()
    })

    it("labels the row with the owner's name, not as the viewer's answer", () => {
      const { getByText, queryByText } = render(
        <AttendanceValidation
          contextualizedEvent={delegatedContext}
          user={makeUser('alice@example.com')}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(getByText('eventPreview.answerOfQuestion')).toBeTruthy()
      expect(queryByText('eventPreview.attendingQuestion')).toBeNull()
    })

    it('returns null for a read-only delegate', () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={{
            ...delegatedContext,
            calendar: {
              ...delegatedContext.calendar,
              access: { read: true, write: false }
            } as Calendar
          }}
          user={makeUser('alice@example.com')}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('team calendar', () => {
    const teamContext = makeContext({
      isOwn: true, // every member counts among the owners
      calendar: {
        id: 'team1/cal1',
        name: 'Team A',
        delegated: true,
        access: { read: true, write: false },
        owner: { emails: ['alice@example.com'], teamCalendar: true },
        events: {}
      } as Calendar,
      currentUserAttendee: undefined
    })

    it('returns null when the member is not an attendee', () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={teamContext}
          user={makeUser('alice@example.com')}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it("asks the member for their own answer when they're an attendee", () => {
      const { getByText } = render(
        <AttendanceValidation
          contextualizedEvent={{
            ...teamContext,
            currentUserAttendee: {
              cal_address: 'alice@example.com',
              partstat: 'NEEDS-ACTION'
            } as userAttendee
          }}
          user={makeUser('alice@example.com')}
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(getByText('eventPreview.attendingQuestion')).toBeTruthy()
    })
  })

  describe('resource calendar', () => {
    const resourceContext = makeContext({
      isOwn: false,
      calendar: {
        id: 'res1/cal1',
        name: 'Resource Cal',
        delegated: false,
        owner: {
          emails: ['resource@example.com'],
          resource: true,
          administrators: [{ id: 'admin1' }]
        },
        events: {}
      } as Calendar
    })

    it('renders when user is an administrator of the resource', () => {
      const { getByText } = render(
        <AttendanceValidation
          contextualizedEvent={resourceContext}
          user={
            {
              ...makeUser('admin@example.com'),
              openpaasId: 'admin1'
            } as userData
          }
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(getByText('eventPreview.authorizeQuestion')).toBeTruthy()
    })

    it('returns null when user is not an administrator of the resource', () => {
      const { container } = render(
        <AttendanceValidation
          contextualizedEvent={{
            ...resourceContext,
            currentUserAttendee: undefined
          }}
          user={
            {
              ...makeUser('other@example.com'),
              openpaasId: 'other1'
            } as userData
          }
          setAfterChoiceFunc={noopSetFunc}
          setOpenEditModePopup={noopSetFunc}
        />
      )
      expect(container.firstChild).toBeNull()
    })
  })
})
