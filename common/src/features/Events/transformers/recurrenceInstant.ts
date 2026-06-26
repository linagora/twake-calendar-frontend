import moment from 'moment-timezone'

/**
 * Converts a RECURRENCE-ID / EXDATE jCal value into a comparable instant
 * (epoch milliseconds). The same occurrence can be expressed in several
 * date-time forms — a bare UTC value (trailing `Z`), a TZID local wall-clock
 * value, or a floating value — and a plain string comparison treats them as
 * different occurrences. That made the CalDAV server reject the update with a
 * "Duplicate RECURRENCE-ID" / EXDATE form error, because the same occurrence
 * ended up emitted twice in two different forms. See #1088.
 *
 * Resolution order:
 * - a trailing `Z` is treated as UTC,
 * - otherwise the explicit `tzid` parameter (when present) fixes the zone,
 * - otherwise the value is interpreted in `fallbackTz` (the series timezone).
 *
 * Returns `NaN` for empty/unparseable values so callers can skip them.
 */
export function recurrenceInstant(
  value: unknown,
  tzid?: string,
  fallbackTz?: string
): number {
  const raw = value == null ? '' : String(value)
  if (!raw) {
    return NaN
  }
  if (/Z$/.test(raw)) {
    return moment.utc(raw).valueOf()
  }
  const zone = tzid ?? fallbackTz
  if (zone && moment.tz.zone(zone)) {
    return moment.tz(raw, zone).valueOf()
  }
  return moment(raw).valueOf()
}

/**
 * True when two RECURRENCE-ID / EXDATE values designate the same occurrence.
 * Keeps the historical lenient string match (a trailing `Z` is ignored) and
 * additionally recognises values that resolve to the same instant even when
 * written in different forms (UTC vs TZID local time).
 */
export function sameRecurrence(
  a: { value: unknown; tzid?: string },
  b: { value: unknown; tzid?: string },
  fallbackTz?: string
): boolean {
  if (normalizeRecurrenceId(a.value) === normalizeRecurrenceId(b.value)) {
    return true
  }
  const instantA = recurrenceInstant(a.value, a.tzid, fallbackTz)
  const instantB = recurrenceInstant(b.value, b.tzid, fallbackTz)
  return (
    Number.isFinite(instantA) &&
    Number.isFinite(instantB) &&
    instantA === instantB
  )
}

/** Strips a trailing `Z` for the lenient string-form comparison. */
export function normalizeRecurrenceId(id: unknown): string {
  const raw = typeof id === 'string' || typeof id === 'number' ? String(id) : ''
  return raw.replace(/Z$/, '')
}

/**
 * Reads the `TZID` parameter of a jCal property regardless of key casing.
 * ICAL.js normally lowercases parameter names, but the lookup stays
 * case-insensitive so an upper-cased `TZID` cannot silently fall back to the
 * bare UTC form and break SabreDAV's date-time form validation.
 */
export function getTzidParam(
  params: Record<string, unknown> | undefined
): string | undefined {
  if (!params) {
    return undefined
  }
  const key = Object.keys(params).find(k => k.toLowerCase() === 'tzid')
  const value = key ? params[key] : undefined
  return typeof value === 'string' ? value : undefined
}
