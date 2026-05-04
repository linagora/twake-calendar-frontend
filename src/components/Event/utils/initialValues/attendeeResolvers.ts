import { CalendarEvent } from '@/features/Events/EventsTypes'
import { userAttendee } from '@/features/User/models/attendee'
import { userOrganiser } from '@/features/User/userDataTypes'

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

  const attendees = allAttendees.filter(
    (a: userAttendee) =>
      a.cal_address !== organizerEmail && a.cutype !== 'RESOURCE'
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
