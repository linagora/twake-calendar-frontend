import { Calendar } from '@common/types/CalendarTypes'
import { userData } from '@common/features/User/userDataTypes'
import { CalendarEvent, ContextualizedEvent } from '@common/types/EventsTypes'
import { normalizeIdentity } from '@common/utils/normalizeIdentity'

interface CheckIsOrganizerOptions {
  event: CalendarEvent
  ownerEmails: string[]
  isTeamCalendar: boolean
  isOwn: boolean
  attendeeEmail?: string
}

function checkIsOrganizer({
  event,
  ownerEmails,
  isTeamCalendar,
  isOwn,
  attendeeEmail
}: CheckIsOrganizerOptions): boolean {
  if (isTeamCalendar) {
    const organizerEmail = event.organizer?.cal_address
    if (!organizerEmail) {
      return isOwn
    }
    const normalizedOrganizer = normalizeIdentity(organizerEmail)
    return Boolean(
      ownerEmails.some(
        email => normalizeIdentity(email) === normalizedOrganizer
      )
    )
  }

  if (event.organizer) {
    return (
      normalizeIdentity(attendeeEmail) ===
      normalizeIdentity(event.organizer.cal_address)
    )
  }

  return isOwn
}

export function createEventContext(
  event: CalendarEvent,
  calendar: Calendar,
  user: userData
): ContextualizedEvent {
  const calendarOwner = calendar.owner || {}
  const ownerEmails = calendarOwner.emails || []
  const isTeamCalendar = Boolean(calendarOwner.teamCalendar)

  const isOwn = ownerEmails.includes(user.email)

  const isRecurring = Boolean(event.uid.includes('/'))
  const attendeeEmail =
    calendar.delegated && !isTeamCalendar ? ownerEmails[0] : user.email

  const eventAttendee = event.attendee || []
  const currentUserAttendee = calendarOwner.resource
    ? eventAttendee.find(
        person => person.cutype === 'RESOURCE' && person.cn === calendar.name
      )
    : eventAttendee.find(
        person =>
          normalizeIdentity(person.cal_address) ===
          normalizeIdentity(attendeeEmail)
      )

  const isOrganizer = checkIsOrganizer({
    event,
    ownerEmails,
    isTeamCalendar,
    isOwn,
    attendeeEmail
  })

  return {
    event,
    calendar,
    currentUserAttendee,
    isOwn,
    isRecurring,
    isOrganizer
  }
}
