import { userAttendee } from '@common/features/User/models/attendee'

// The team is read from the metadata of the calendar the event is opened in,
// never from the event itself: whoever sends an invitation controls its ICS
// properties (e.g. the legacy X-OPENPAAS-TEAM-CALENDAR-ID), not the calendar.
export const getTeamOrganizer = ({
  teamName,
  organizer,
  t
}: {
  teamName?: string
  organizer?: userAttendee
  t: (key: string, options?: Record<string, string>) => string
}): {
  isTeamOverride: boolean
  displayOrganizer: userAttendee | undefined
  isOriginalOrganizer: boolean
  organizerCaption: string | undefined
} => {
  const isTeamOverride = Boolean(teamName)
  const displayOrganizer = isTeamOverride
    ? ({ ...organizer, cn: teamName } as userAttendee)
    : organizer

  const isOriginalOrganizer = !isTeamOverride
  const organizerCaption = isTeamOverride
    ? t('event.teamOrganizerWithName', {
        organizerName: organizer?.cn || organizer?.cal_address || ''
      })
    : undefined

  return {
    isTeamOverride,
    displayOrganizer,
    isOriginalOrganizer,
    organizerCaption
  }
}
