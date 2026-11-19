import {
  getOrganizingTeamName,
  getTeamOrganizer
} from '@common/components/EventPreview/teamOrganizer'
import { userAttendee } from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'

const t = (key: string, options?: Record<string, string>): string =>
  `${key}:${options?.organizerName ?? ''}`

const organizer = {
  cn: 'Alice',
  cal_address: 'alice@example.com'
} as userAttendee

describe('getTeamOrganizer', () => {
  it('shows the team of the calendar and keeps the event organizer as caption', () => {
    const result = getTeamOrganizer({ teamName: 'Team A', organizer, t })

    expect(result).toEqual({
      isTeamOverride: true,
      displayOrganizer: { ...organizer, cn: 'Team A' },
      isOriginalOrganizer: false,
      organizerCaption: 'event.teamOrganizerWithName:Alice'
    })
  })

  it('falls back on the organizer address when it has no name', () => {
    const result = getTeamOrganizer({
      teamName: 'Team A',
      organizer: { cal_address: 'alice@example.com' } as userAttendee,
      t
    })

    expect(result.organizerCaption).toBe(
      'event.teamOrganizerWithName:alice@example.com'
    )
  })

  it('shows the event organizer outside a team calendar', () => {
    const result = getTeamOrganizer({ organizer, t })

    expect(result).toEqual({
      isTeamOverride: false,
      displayOrganizer: organizer,
      isOriginalOrganizer: true,
      organizerCaption: undefined
    })
  })
})

describe('getOrganizingTeamName', () => {
  const teamCalendar = {
    id: 'team1/cal1',
    name: 'Team A',
    owner: {
      lastname: 'Team A',
      teamCalendar: true,
      emails: ['alice@example.com', 'bob@example.com']
    }
  } as unknown as Calendar

  it('names the team when one of its members organizes', () => {
    expect(
      getOrganizingTeamName(teamCalendar, {
        cal_address: 'mailto:Alice@Example.com'
      })
    ).toBe('Team A')
  })

  it('does not name the team for an invitation from someone outside it', () => {
    expect(
      getOrganizingTeamName(teamCalendar, { cal_address: 'john@external.com' })
    ).toBeUndefined()
  })

  it('does not name the team for an event without organizer', () => {
    expect(getOrganizingTeamName(teamCalendar, undefined)).toBeUndefined()
  })

  it('does not name a team outside a team calendar', () => {
    const personalCalendar = {
      ...teamCalendar,
      owner: { ...teamCalendar.owner, teamCalendar: false }
    } as Calendar

    expect(
      getOrganizingTeamName(personalCalendar, {
        cal_address: 'alice@example.com'
      })
    ).toBeUndefined()
  })
})
