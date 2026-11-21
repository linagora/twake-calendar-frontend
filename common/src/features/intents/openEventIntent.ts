import {
  EVENT_CANCELED_ERROR,
  EVENT_NOT_FOUND_ERROR,
  type FoundEvent
} from '@common/features/Calendars/services/getEventByUidAsync'
import type { RejectedError } from '@common/features/Calendars/types/RejectedError'
import type { userAttendee } from '@common/features/User/models/attendee'
import type { CalendarEvent } from '@common/types/EventsTypes'
import { normalizeIdentity } from '@common/utils/normalizeIdentity'
import { isIntent, NEW_EVENT_INTENT } from './newEventIntent'

/**
 * The intent of the preview of an event, declared in the manifest of the
 * `calendar` app (cozy/cozy-twakecalendar): another app (Twake Chat) shows a
 * meeting and lets the user reply to its invitation in the calendar.
 */
export const OPEN_EVENT_INTENT = {
  action: 'OPEN',
  type: NEW_EVENT_INTENT.type
}

/** A reply to an invitation: the user comes, does not, or may */
export type Reply = 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'

const REPLIES: readonly string[] = ['ACCEPTED', 'DECLINED', 'TENTATIVE']

const isReply = (value: unknown): value is Reply =>
  typeof value === 'string' && REPLIES.includes(value)

/**
 * What the card of the client shows of the event: the reply is sent at once
 * only when the event found is that one
 */
export interface ExpectedEvent {
  title: string
  /** ISO 8601 */
  start: string
}

/**
 * What the client sends with the intent, read: the UID of the event, the
 * reply to send first (null when there is none) and what the card shows
 * (null when it says nothing)
 */
export interface OpenEventData {
  uid: string
  reply: Reply | null
  expected: ExpectedEvent | null
}

/**
 * What the client gets once the user closes the preview: their reply, null
 * when they have given none (or are not invited)
 */
export interface OpenedEvent {
  partstat: Reply | null
}

/** Whether the intent is the one of the preview (the action in any case) */
export function isOpenEventIntent(action: string, type: string): boolean {
  return isIntent(OPEN_EVENT_INTENT, action, type)
}

// null when it is not `{ title, start }` with a date
function parseExpected(value: unknown): ExpectedEvent | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  const { title, start } = value as { title?: unknown; start?: unknown }
  if (typeof title !== 'string' || typeof start !== 'string') return null
  return Number.isNaN(Date.parse(start)) ? null : { title, start }
}

// The reply and the card, each absent or valid: null when one is not
function parseAsked(
  partstat: unknown,
  expected: unknown
): Pick<OpenEventData, 'reply' | 'expected'> | null {
  if (partstat !== undefined && !isReply(partstat)) return null
  const card = expected === undefined ? null : parseExpected(expected)
  if (expected !== undefined && card === null) return null
  return { reply: partstat ?? null, expected: card }
}

/**
 * The event the client asks for:
 * `{ uid: string, partstat?: Reply, expected?: { title, start } }`. Null
 * when the data has another shape (no UID, a partstat that is no reply,
 * NEEDS-ACTION included, an expected that is no title with a start date):
 * the intent then fails.
 */
export function parseOpenEventData(data: unknown): OpenEventData | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null
  }
  const { uid, partstat, expected } = data as {
    uid?: unknown
    partstat?: unknown
    expected?: unknown
  }
  if (typeof uid !== 'string' || uid.trim() === '') return null
  const asked = parseAsked(partstat, expected)
  return asked && { uid, ...asked }
}

/** The reply of an attendee, null while they have given none */
export function replyOf(attendee: userAttendee | undefined): Reply | null {
  const partstat = attendee?.partstat
  return isReply(partstat) ? partstat : null
}

/** The row of the user among the attendees, by their address */
export function attendeeRowOf(
  event: CalendarEvent,
  email: string
): userAttendee | undefined {
  const address = normalizeIdentity(email)
  return event.attendee?.find(
    attendee => normalizeIdentity(attendee.cal_address) === address
  )
}

/**
 * The reply the page sends before it shows the event: the one the client
 * asked for, unless the user is not invited or already gave it
 */
export function replyToSend(
  event: CalendarEvent,
  email: string,
  asked: Reply | null
): Reply | null {
  const row = attendeeRowOf(event, email)
  if (asked === null || row === undefined) return null
  return replyOf(row) === asked ? null : asked
}

/** Where the lookup of the event by its UID stands */
export type EventLookup =
  | { status: 'loading' }
  | {
      status: 'found'
      calId: string
      eventId: string
      /** The event is the one the card shows: a reply asked may go at once */
      isExpected: boolean
    }
  /** Unknown UID, or an event its organizer cancelled: what the user reads */
  | { status: 'missing'; message: string }
  | { status: 'failed' }

/**
 * Whether an event of the UID is the one the card shows: the same title once
 * trimmed (case counts) and the same instant, whatever the offset, as the
 * start of the master (DTSTART) or of an occurrence (RECURRENCE-ID)
 */
function isExpectedEvent(
  events: CalendarEvent[],
  expected: ExpectedEvent | null
): boolean {
  if (expected === null) return false
  const instant = Date.parse(expected.start)
  return events.some(
    event =>
      event.title?.trim() === expected.title.trim() &&
      Date.parse(event.recurrenceId ?? event.start) === instant
  )
}

/**
 * The event the lookup found (getEventByUid), as the link `/events/:uid`
 * picks it (the event of that UID, else its first occurrence), among the
 * VEVENTs the user is an attendee of when there are any: a user invited to
 * one occurrence of a series alone replies to that occurrence. Nothing found
 * means the server answered with nothing the page can show (an event in a
 * calendar the user does not list, an empty answer): the lookup failed.
 */
export function foundLookup(
  found: FoundEvent | null,
  uid: string,
  email: string,
  expected: ExpectedEvent | null
): EventLookup {
  const events = found?.events ?? []
  const invitedTo = events.filter(event => attendeeRowOf(event, email))
  const candidates = invitedTo.length > 0 ? invitedTo : events
  const event =
    candidates.find(candidate => candidate.uid === uid) ?? candidates[0]
  if (!found || !event) return { status: 'failed' }
  return {
    status: 'found',
    calId: found.calId,
    eventId: event.uid,
    isExpected: isExpectedEvent(events, expected)
  }
}

/**
 * Why the lookup failed: an unknown UID (404) or a cancelled event is
 * missing, anything else a failure of the server
 */
export function failedLookup(error: RejectedError | undefined): EventLookup {
  if (error?.status === 404) {
    return { status: 'missing', message: EVENT_NOT_FOUND_ERROR }
  }
  if (error?.message === EVENT_CANCELED_ERROR) {
    return { status: 'missing', message: EVENT_CANCELED_ERROR }
  }
  return { status: 'failed' }
}
