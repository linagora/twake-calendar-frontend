/**
 * The suffix the client appends to the UID of an occurrence to key it in the
 * store: `/<occurrenceKey>` (see `processEventUid` in parseCalendarEvent.ts),
 * a RECURRENCE-ID date or date-time (`20261030`, `2026-10-30`,
 * `2026-10-30T13:00:00Z`, `2026-10-30T14:00:00`).
 */
const OCCURRENCE_SUFFIX =
  /\/(\d{4}-?\d{2}-?\d{2}(?:T\d{2}:?\d{2}:?\d{2}(?:\.\d+)?Z?)?)$/

/**
 * Splits a store key into the stored UID and, for an occurrence, its
 * occurrence key. A UID is TEXT (RFC 5545 3.8.4.7) and may itself hold "/":
 * only the trailing occurrence suffix is removed, see #2064.
 */
export function splitEventKey(eventKey: string): {
  baseUid: string
  occurrenceKey?: string
} {
  if (!eventKey) return { baseUid: '' }
  const match = OCCURRENCE_SUFFIX.exec(eventKey)
  if (!match) return { baseUid: eventKey }
  return {
    baseUid: eventKey.slice(0, match.index),
    occurrenceKey: match[1]
  }
}

export function extractEventBaseUuid(eventKey: string): string {
  return splitEventKey(eventKey).baseUid
}

/** The owner of a calendar, whose id is `<ownerId>/<calendarId>`. */
export function extractCalendarOwnerId(calendarId: string): string {
  if (!calendarId) return ''
  return calendarId.split('/')[0]
}
