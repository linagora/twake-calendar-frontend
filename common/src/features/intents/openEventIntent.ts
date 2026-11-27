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

// A plain object, as the client sends one in a message
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// An ISO 8601 date, or date and time, with any offset: Date.parse alone also
// takes other shapes (« Nov 23 2026 »), read differently by each browser
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ISO_DATE.test(value) &&
    !Number.isNaN(Date.parse(value))
  )
}

// null when it is not `{ title, start }` with an ISO date
function parseExpected(value: unknown): ExpectedEvent | null {
  if (!isRecord(value)) return null
  const { title, start } = value
  return typeof title === 'string' && isIsoDate(start) ? { title, start } : null
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
  if (!isRecord(data)) return null
  const { uid, partstat, expected } = data
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

// The VEVENT is the one the card shows: the same title once trimmed (case
// counts) and the same instant, whatever the offset, as its start (DTSTART
// of a master, RECURRENCE-ID of an occurrence)
function isCardEvent(event: CalendarEvent, expected: ExpectedEvent): boolean {
  return (
    event.title?.trim() === expected.title.trim() &&
    Date.parse(event.recurrenceId ?? event.start) === Date.parse(expected.start)
  )
}

/**
 * Whether an event of the UID is the one the card shows (isCardEvent). Used
 * by foundLookup, and by the page again before it writes the reply asked,
 * each on the VEVENTs of cardCandidates.
 */
export function isExpectedEvent(
  events: CalendarEvent[],
  expected: ExpectedEvent | null
): boolean {
  return expected !== null && events.some(event => isCardEvent(event, expected))
}

/**
 * The VEVENTs that may be the card of the event picked: the whole series
 * for its master (the reply goes to every occurrence); for an occurrence (the
 * master does not invite the user), that occurrence (its RECURRENCE-ID, kept
 * in its uid), and the master (its DTSTART) only when no other occurrence
 * invites the user: with several, a card of the master names none of them.
 * The occurrence is taken from the events given (its uid), not from the one
 * picked, which may be the one loaded at the lookup: none when it is gone.
 */
export function cardCandidates(
  events: CalendarEvent[],
  picked: CalendarEvent,
  email: string
): CalendarEvent[] {
  if (!picked.recurrenceId) return events
  // The occurrence as these events hold it (read again, its organizer may
  // have renamed it since), none when it is gone
  const occurrence = events.find(event => event.uid === picked.uid)
  if (!occurrence) return []
  const invitedTo = events.filter(
    event => event.recurrenceId && attendeeRowOf(event, email)
  )
  const masters = events.filter(event => !event.recurrenceId)
  return invitedTo.length === 1 ? [occurrence, ...masters] : [occurrence]
}

// The check of getEventByUidAsync (isCanceled) is private and reads a
// FoundEvent by its UID; this one reads any VEVENT
const isCancelled = (event: CalendarEvent): boolean =>
  event.status === 'CANCELLED'

/**
 * Whether the event picked still takes the reply, in the events read again
 * right before the write: it is still there (its uid), still lists the user
 * among its attendees, and neither it nor the master of its series is
 * cancelled. Otherwise the write would put back the attendees read at the
 * lookup. Used by the page (useAskedReply), with isExpectedEvent.
 */
export function isStillInvited(
  events: CalendarEvent[],
  picked: CalendarEvent,
  email: string
): boolean {
  const target = events.find(event => event.uid === picked.uid)
  if (!target || !attendeeRowOf(target, email)) return false
  const masters = events.filter(event => !event.recurrenceId)
  return ![target, ...masters].some(isCancelled)
}

// The event of that UID, else the occurrence the card shows, else the first
function pickEvent(
  candidates: CalendarEvent[],
  uid: string,
  expected: ExpectedEvent | null
): CalendarEvent | undefined {
  return (
    candidates.find(candidate => candidate.uid === uid) ??
    candidates.find(candidate => isExpectedEvent([candidate], expected)) ??
    candidates[0]
  )
}

/**
 * The event the lookup found (getEventByUid), as the link `/events/:uid`
 * picks it (the event of that UID, else the occurrence the card shows, else
 * the first one), among the VEVENTs the user is an attendee of when there
 * are any: a user invited to one occurrence of a series alone replies to
 * that occurrence. One its organizer cancelled is missing, as a cancelled
 * series is. Nothing found means the server answered with nothing the page
 * can show (an event in a calendar the user does not list, an empty
 * answer): the lookup failed.
 */
export function foundLookup(
  found: FoundEvent | null,
  uid: string,
  email: string,
  expected: ExpectedEvent | null
): EventLookup {
  const events = found?.events ?? []
  const invitedTo = events.filter(event => attendeeRowOf(event, email))
  const event = pickEvent(
    invitedTo.length > 0 ? invitedTo : events,
    uid,
    expected
  )
  if (!found || !event) return { status: 'failed' }
  // The thunk checks the master alone: an occurrence the organizer cancelled
  // is no invitation either
  if (isCancelled(event)) {
    return { status: 'missing', message: EVENT_CANCELED_ERROR }
  }
  return {
    status: 'found',
    calId: found.calId,
    eventId: event.uid,
    isExpected: isExpectedEvent(cardCandidates(events, event, email), expected)
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
