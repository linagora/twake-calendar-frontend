import { getTeamOrganizer } from '@common/components/EventPreview/teamOrganizer'
import { userAttendee } from '@common/features/User/models/attendee'

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
