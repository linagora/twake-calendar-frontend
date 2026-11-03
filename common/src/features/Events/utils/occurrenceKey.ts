import moment from 'moment-timezone'
import { recurrenceInstant } from '@common/features/Events/transformers/recurrenceInstant'
import { isMomentZone, resolveTimezone } from '@common/utils/timezone'

const DATE_ONLY = /^(\d{4}-\d{2}-\d{2}|\d{8})$/

function isKnownZone(tz?: string): boolean {
  return !!tz && isMomentZone(resolveTimezone(tz))
}

/**
 * The part of a store key that tells an occurrence apart from the others of
 * its series. An expanded REPORT writes RECURRENCE-ID in UTC
 * (`2026-10-30T13:00:00Z`), while a stored object keeps its TZID form
 * (`TZID=Europe/Paris:20261030T140000`): both are brought to the UTC form, so
 * the same occurrence read from both lands on a single key. See #1862.
 *
 * A date-only value (all-day series) and a value whose zone cannot be told
 * are kept as they are.
 */
export function occurrenceKey(
  recurrenceId: string,
  tzid?: string,
  fallbackTz?: string
): string {
  if (DATE_ONLY.test(recurrenceId)) {
    return recurrenceId
  }
  if (
    !/Z$/.test(recurrenceId) &&
    !isKnownZone(tzid) &&
    !isKnownZone(fallbackTz)
  ) {
    return recurrenceId
  }
  const instant = recurrenceInstant(recurrenceId, tzid, fallbackTz)
  return Number.isFinite(instant)
    ? moment.utc(instant).format('YYYY-MM-DDTHH:mm:ss[Z]')
    : recurrenceId
}
