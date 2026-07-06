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
 * (?attendee=a,b) forms, and drops blank entries.
 */
export function parseNewEventAttendees(params: URLSearchParams): string[] {
  return params
    .getAll(NEW_EVENT_ATTENDEE_PARAM)
    .flatMap(value => value.split(','))
    .map(email => email.trim())
    .filter(email => email.length > 0)
}
