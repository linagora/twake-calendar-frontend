import { CalendarEvent } from '@common/types/EventsTypes'
import { userAttendee } from '@common/features/User/models/attendee'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { normalizeIdentity } from '@common/utils/normalizeIdentity'

/**
 * Filters attendees and extracts resources.
 */
export function resolveAttendeesAndResources(
  event: CalendarEvent,
  organizerEmail: string | undefined
): {
  attendees: userAttendee[]
  selectedResources: { email: string; displayName: string }[]
} {
  const allAttendees = event.attendee ?? []
  const organizerIdentity = normalizeIdentity(organizerEmail)

  const attendees = allAttendees.filter(
    (a: userAttendee) =>
      (!organizerIdentity ||
        normalizeIdentity(a.cal_address) !== organizerIdentity) &&
      a.cutype !== 'RESOURCE'
  )

  const selectedResources = allAttendees
    .filter((a: userAttendee) => a.cutype === 'RESOURCE')
    .map(a => ({ email: a.cal_address, displayName: a.cn }))

  return { attendees, selectedResources }
}

export function resolveOrganizerEmail(
  event: CalendarEvent,
  organizer: userOrganiser | userAttendee | undefined
): string | undefined {
  return event.organizer?.cal_address || organizer?.cal_address
}
