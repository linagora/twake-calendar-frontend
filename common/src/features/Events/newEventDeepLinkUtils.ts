import { userAttendee } from '@common/features/User/models/attendee'
import { EmailAddress } from '@common/types/EmailAddress'
import type { CalendarEvent } from '@common/types/EventsTypes'

// Session storage key used to carry the attendee(s) that should prefill a new
// event once the user lands on the calendar page (e.g. when following a
// /newEvent?attendee=xxx@yyy.com deep link that first has to go through the
// authentication flow).
export const PENDING_NEW_EVENT_ATTENDEES_KEY = 'pendingNewEventAttendees'

// Query parameter carrying the attendee email(s) on the /newEvent deep link.
export const NEW_EVENT_ATTENDEE_PARAM = 'attendee'

/**
 * Extracts the attendee email(s) from the /newEvent deep link query string.
 * Supports both repeated (?attendee=a&attendee=b) and comma separated
 * (?attendee=a,b) forms, and drops blank entries as well as invalid email
 * addresses (validated like the participants field does).
 */
export function parseNewEventAttendees(params: URLSearchParams): string[] {
  return params
    .getAll(NEW_EVENT_ATTENDEE_PARAM)
    .flatMap(value => value.split(','))
    .map(email => email.trim())
    .filter(email => EmailAddress.parse(email) !== null)
}

/**
 * The event the create form opens with when a link names its attendees:
 * no date yet, each attendee asked to reply.
 */
export function newEventWithAttendees(emails: string[]): CalendarEvent {
  return {
    start: '',
    end: '',
    allday: false,
    attendee: emails.map(
      email => new userAttendee({ cal_address: email, cn: email, rsvp: 'TRUE' })
    )
  } as CalendarEvent
}
