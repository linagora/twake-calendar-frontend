import { EmailAddress } from '@common/types/EmailAddress'
import type { CalendarEvent } from '@common/types/EventsTypes'
import { normalizeIdentity, stripMailto } from '@common/utils/normalizeIdentity'

/**
 * The intent of the new event form, declared in the manifest of the
 * `calendar` app (cozy/cozy-twakecalendar): another app (Twake Chat) asks
 * for a new event, with the members of a room as attendees.
 */
export const NEW_EVENT_INTENT = {
  action: 'CREATE',
  type: 'io.cozy.calendar.events'
}

/** What the client sends with the intent, read: the e-mail addresses */
export interface NewEventData {
  attendees: string[]
}

/** An attendee of the saved event: `name` null when it has none */
export interface CreatedEventAttendee {
  email: string
  name: string | null
}

/**
 * The event the client gets once the server saved it: `start` and `end` in
 * ISO 8601 (an all-day event from midnight UTC of its first day to midnight
 * UTC of the day after its last, as `DTEND`), `url` its page in the
 * calendar, `attendees` the people invited, the organizer included. Closed
 * without saving, the intent is cancelled: the client gets null.
 */
export interface CreatedEvent {
  uid: string
  title: string
  start: string
  end: string
  allDay: boolean
  timeZone: string
  videoConferenceUrl: string | null
  url: string
  attendees: CreatedEventAttendee[]
}

/** Whether the intent is the declared one (the action in any case) */
export function isIntent(
  declared: { action: string; type: string },
  action: string,
  type: string
): boolean {
  return action.toUpperCase() === declared.action && type === declared.type
}

/** Whether the intent is the one of a new event (the action in any case) */
export function isNewEventIntent(action: string, type: string): boolean {
  return isIntent(NEW_EVENT_INTENT, action, type)
}

// Strings only; the empty ones and those that are no e-mail address are
// dropped, as /newEvent?attendee= does
function readAttendees(value: unknown): string[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return null
  if (!value.every((item): item is string => typeof item === 'string')) {
    return null
  }
  return value
    .map(address => address.trim())
    .filter(address => EmailAddress.parse(address) !== null)
}

/**
 * The new event the client asks for: `{ attendees?: string[] }`. Null when
 * the data has another shape: the intent then fails.
 */
export function parseNewEventData(data: unknown): NewEventData | null {
  if (data === undefined || data === null) return { attendees: [] }
  if (typeof data !== 'object' || Array.isArray(data)) return null
  const attendees = readAttendees((data as { attendees?: unknown }).attendees)
  return attendees === null ? null : { attendees }
}

// The people of the event as the calendar counts its participants: the rooms
// and equipment booked with it left out. The form saves the CN of an address
// the client sent as the address itself: that is no name
function attendeesOf(event: CalendarEvent): CreatedEventAttendee[] {
  return (event.attendee ?? [])
    .filter(attendee => attendee.cutype !== 'RESOURCE')
    .map(attendee => {
      const email = stripMailto(attendee.cal_address)
      const name = attendee.cn.trim()
      const isNamed =
        name !== '' && normalizeIdentity(name) !== normalizeIdentity(email)
      return { email, name: isNamed ? name : null }
    })
}

/** The saved event, as the client reads it (see CreatedEvent) */
export function createdEvent(event: CalendarEvent): CreatedEvent {
  return {
    uid: event.uid,
    title: event.title ?? '',
    start: event.start,
    end: event.end ?? event.start,
    allDay: event.allday ?? false,
    timeZone: event.timezone,
    videoConferenceUrl: event.x_openpass_videoconference ?? null,
    // The deep link of the event (EventDeepLink)
    url: `${window.location.origin}/events/${encodeURIComponent(event.uid)}`,
    attendees: attendeesOf(event)
  }
}
