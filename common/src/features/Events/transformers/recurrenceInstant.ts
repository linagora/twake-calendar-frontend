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
 * True when a value resolves to an unambiguous instant: it carries a trailing
 * `Z`, an explicit `tzid`, or a `fallbackTz` is supplied to anchor the bare
 * wall-clock value. Without any of these the value is tz-naive and would be
 * resolved in the (arbitrary) system-local zone, so its instant cannot be
 * trusted for comparison.
 */
function hasDefiniteZone(
  value: unknown,
  tzid?: string,
  fallbackTz?: string
): boolean {
  const raw = value == null ? '' : String(value)
  if (!raw) {
    return false
  }
  if (/Z$/.test(raw)) {
    return true
  }
  const zone = tzid ?? fallbackTz
  return Boolean(zone && moment.tz.zone(zone))
}

/**
 * True when two RECURRENCE-ID / EXDATE values designate the same occurrence.
 * Compares the resolved instants when both sides carry an unambiguous zone, so
 * two forms of the same occurrence (UTC vs TZID local time) match while
 * genuinely different occurrences stay distinct — even when `fallbackTz` is
 * non-UTC, where a bare value and its `Z`-suffixed form resolve to different
 * instants.
 *
 * When either side is tz-naive (no `Z`, no `tzid`, no `fallbackTz`) its instant
 * would be resolved in the arbitrary system-local zone and cannot be trusted,
 * so the comparison falls back to the lenient wall-clock string match (a
 * trailing `Z` is ignored). This is the only signal available, and it keeps the
 * solo recurring-instance RSVP matching when the in-memory event carries no
 * timezone. See #1088.
 */
export function sameRecurrence(
  a: { value: unknown; tzid?: string },
  b: { value: unknown; tzid?: string },
  fallbackTz?: string
): boolean {
  const instantA = recurrenceInstant(a.value, a.tzid, fallbackTz)
  const instantB = recurrenceInstant(b.value, b.tzid, fallbackTz)
  const bothDefinite =
    hasDefiniteZone(a.value, a.tzid, fallbackTz) &&
    hasDefiniteZone(b.value, b.tzid, fallbackTz)
  if (bothDefinite && Number.isFinite(instantA) && Number.isFinite(instantB)) {
    return instantA === instantB
  }

  const normalizedA = normalizeRecurrenceId(a.value)
  const normalizedB = normalizeRecurrenceId(b.value)
  return Boolean(normalizedA) && normalizedA === normalizedB
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
