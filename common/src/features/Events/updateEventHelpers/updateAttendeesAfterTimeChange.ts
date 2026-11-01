import { userAttendee } from '@common/features/User/models/attendee'
import { CalendarEvent } from '@common/types/EventsTypes'
import { normalizeIdentity } from '@common/utils/normalizeIdentity'

const isSameIdentity = (a?: string, b?: string): boolean =>
  normalizeIdentity(a) === normalizeIdentity(b)

// Addresses are identities: "MAILTO:User@Example.com" is "user@example.com".
// The exact spelling wins when the same identity is listed several times.
export const findStoredAttendee = (
  attendees: userAttendee[],
  addr: string
): userAttendee | undefined =>
  attendees.find(a => a?.cal_address === addr) ??
  attendees.find(a => a && isSameIdentity(a.cal_address, addr))

export const updateAttendeesAfterTimeChange = (
  event: CalendarEvent,
  timeChanged?: boolean,
  attendees?: userAttendee[]
): CalendarEvent => {
  const { attendee, organizer } = event
  if (!attendee) return event

  const organizerAddr = organizer?.cal_address

  const markNeedsAction = (att: userAttendee): userAttendee =>
    att.withPartStat('NEEDS-ACTION').withRsvp('TRUE')

  const getExistingOrDefault = (
    addr: string,
    fallback: userAttendee
  ): userAttendee => findStoredAttendee(attendee, addr) ?? fallback

  if (attendees) {
    const updatedAttendees = attendees.map(att => {
      const existing = getExistingOrDefault(
        att.cal_address,
        markNeedsAction(att)
      )
      return timeChanged ? markNeedsAction(existing) : existing
    })

    // Only append organizer entry if organizer exists
    const organizerEntry =
      organizer && organizerAddr
        ? getExistingOrDefault(
            organizerAddr,
            markNeedsAction(userAttendee.fromOrganizer(organizer))
          )
        : null

    const deduped = organizerEntry
      ? updatedAttendees.filter(
          attendee => !isSameIdentity(attendee.cal_address, organizerAddr)
        )
      : updatedAttendees

    return {
      ...event,
      attendee: organizerEntry ? [...deduped, organizerEntry] : updatedAttendees
    }
  }

  const updatedAttendees = attendee.map(att => {
    if (organizerAddr && isSameIdentity(att.cal_address, organizerAddr))
      return att
    return timeChanged ? markNeedsAction(att) : att
  })

  return {
    ...event,
    attendee: updatedAttendees
  }
}
