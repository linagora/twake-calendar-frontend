import { userAttendee } from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { normalizeIdentity } from '@common/utils/normalizeIdentity'

const isOrganizedByTeamMember = (
  calendar: Calendar,
  organizer?: { cal_address?: string }
): boolean => {
  const organizerIdentity = normalizeIdentity(organizer?.cal_address)
  return Boolean(
    organizerIdentity &&
    (calendar.owner?.emails ?? []).some(
      email => normalizeIdentity(email) === organizerIdentity
    )
  )
}

// The team is read from the metadata of the calendar the event is opened in,
// never from the event itself: whoever sends an invitation controls its ICS
// properties (e.g. the legacy X-OPENPAAS-TEAM-CALENDAR-ID), not the calendar.
// A team organizes through one of its members: an invitation from anyone else
// (e.g. an external organizer) only sits in the team calendar, the team did
// not organize it.
export const getOrganizingTeamName = (
  calendar: Calendar,
  organizer?: { cal_address?: string }
): string | undefined =>
  calendar.owner?.teamCalendar && isOrganizedByTeamMember(calendar, organizer)
    ? makeDisplayName(calendar)
    : undefined

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
