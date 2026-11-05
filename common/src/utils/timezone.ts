// timezone.ts

// Ensure ICAL is imported before using this module.
import ICAL from 'ical.js'
import moment from 'moment-timezone'
import { detectDateTimeFormat } from '@common/components/Event/utils/dateTimeHelpers'

// TIMEZONES data must be imported or defined separately.
import { TIMEZONES } from './timezone-data'
import { findTimezoneAlias, findTimezoneData } from './timezoneLookup'

export const browserDefaultTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone

// Core timezone registration functionality
export function registerTimezones() {
  for (const [key, data] of Object.entries(TIMEZONES.zones)) {
    ICAL.TimezoneService.register(key, buildTimezone(key, data.ics))
  }

  for (const [key, data] of Object.entries(TIMEZONES.aliases)) {
    ICAL.TimezoneService.register(key, findTimezone(data.aliasTo))
  }
}

function buildTimezone(tzid: string, ics: string): ICAL.Timezone {
  return (
    ICAL.TimezoneService.get(tzid) ||
    new ICAL.Timezone(new ICAL.Component(ICAL.parse(ics)))
  )
}

function findTimezone(tzid: string): ICAL.Timezone {
  const timezoneData = findTimezoneData(tzid)
  if (timezoneData) {
    return buildTimezone(tzid, timezoneData.ics)
  }

  const aliasTo = findTimezoneAlias(tzid)
  if (aliasTo) {
    return findTimezone(aliasTo)
  }

  throw new Error(`Unknown timezone alias: ${tzid}`)
}

export function resolveTimezone(tzName: string): string {
  if (findTimezoneData(tzName)) {
    return tzName
  }
  return findTimezoneAlias(tzName) ?? tzName
}

/**
 * Whether the browser knows the zone: Intl throws a RangeError on any other,
 * and a stored configuration may well hold one (written by another client, or
 * dropped from the browser's tz database).
 */
export function isValidTimeZone(tzName: unknown): tzName is string {
  if (typeof tzName !== 'string' || !tzName) return false
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tzName })
    return true
  } catch {
    return false
  }
}

/**
 * Whether moment-timezone knows the zone. A TZID comes straight from received
 * data, and moment-timezone keeps its zones in plain objects: it throws a
 * TypeError on an inherited name such as "constructor" or "__proto__".
 */
export function isMomentZone(tzName: unknown): tzName is string {
  if (typeof tzName !== 'string' || !tzName) return false
  try {
    return Boolean(moment.tz.zone(tzName))
  } catch {
    return false
  }
}

/**
 * Resolves a stored TZID to a zone the browser can format in. A TZID unknown
 * to both the table and Intl (custom VTIMEZONE name, typo, retired zone) falls
 * back to UTC: the zone moment-timezone read the event's wall clock in.
 */
export function resolveKnownTimezone(tzName: string): string {
  const resolved = resolveTimezone(tzName)
  return isValidTimeZone(resolved) ? resolved : 'UTC'
}

export function resolveTimezoneId(tzid?: string): string | undefined {
  if (!tzid) return undefined
  return resolveTimezone(tzid)
}

// The basic format of RFC 5545 (20250315T100000Z) in the extended one of jCal,
// which Date and moment read. Any other value is returned as is.
export function normalizeBasicDateTime(datetime: string): string {
  const match = datetime.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z|[+-]\d{2}:?\d{2})?$/
  )
  if (!match) {
    return datetime
  }
  const [, year, month, day, hour, min, sec, tz] = match
  let tzFormatted = tz ?? ''
  if (tz && tz !== 'Z' && !tz.includes(':')) {
    tzFormatted = tz.slice(0, 3) + ':' + tz.slice(3)
  }
  return `${year}-${month}-${day}T${hour}:${min}${sec ? `:${sec}` : ''}${tzFormatted}`
}

export function convertEventDateTimeToISO(
  datetime: string | undefined,
  timezone: string,
  options?: { isAllDay?: boolean }
): string | undefined {
  if (!datetime || !timezone) return undefined
  if (options?.isAllDay) return undefined

  const normalized = normalizeBasicDateTime(datetime)

  if (normalized.includes('Z') || normalized.match(/[+-]\d{2}:\d{2}$/)) {
    return normalized
  }

  const dateOnlyRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
  if (dateOnlyRegex.test(normalized)) {
    return undefined
  }

  // moment-timezone reads an unknown zone as UTC but throws on an inherited
  // name such as "constructor": read that one as UTC too.
  const format = detectDateTimeFormat(normalized)
  const momentDate = moment.tz(
    normalized,
    format,
    isMomentZone(timezone) ? timezone : 'UTC'
  )
  if (!momentDate.isValid()) {
    console.warn(
      `[convertEventDateTimeToISO] Invalid datetime: "${datetime}" with format "${format}" in timezone "${timezone}"`
    )
    return undefined
  }
  return momentDate.toISOString()
}

export function getTimezoneOffset(
  tzName: string,
  date: Date = new Date()
): string {
  // The output is a fixed `UTC±N` label, independent of the user's locale:
  // some locales would print a typographic minus sign (U+2212) or their own
  // prefix, which the `GMT` -> `UTC` replacement below would miss.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tzName,
    timeZoneName: 'shortOffset'
  })

  const currentDate = moment(date).isValid() ? date : new Date()
  const parts = fmt.formatToParts(currentDate)
  const offsetPart = parts.find(p => p.type === 'timeZoneName')
  return offsetPart?.value.replace('GMT', 'UTC') ?? ''
}

/**
 * Returns a formatted timezone label with offset and readable timezone name.
 * Example: "(UTC+2) Europe Paris"
 */
export function formatTimezoneLabel(
  tzName: string = browserDefaultTimeZone
): string {
  return `(${getTimezoneOffset(tzName)}) ${tzName.replace(/_/g, ' ')}`
}
