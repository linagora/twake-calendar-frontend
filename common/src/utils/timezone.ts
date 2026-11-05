// timezone.ts

// Ensure ICAL is imported before using this module.
import ICAL from 'ical.js'
import moment from 'moment-timezone'
import { detectDateTimeFormat } from '@common/components/Event/utils/dateTimeHelpers'
import { VCalComponent } from '@common/features/Calendars/types/CalendarData'

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

function vtimezoneTzid([, props]: VCalComponent): string | undefined {
  const tzid = props.find(([k]) => k.toLowerCase() === 'tzid')?.[3]
  return typeof tzid === 'string' && tzid ? tzid : undefined
}

function toIcalTimezone(vtimezone: VCalComponent): ICAL.Timezone | undefined {
  try {
    const zone = new ICAL.Timezone(new ICAL.Component(vtimezone as unknown[]))
    // ical.js only reads the observances on first use: a zone it cannot expand
    // is not registered, and reads like a TZID without a VTIMEZONE
    zone.utcOffset(ICAL.Time.fromJSDate(new Date(), true))
    return zone
  } catch {
    return undefined
  }
}

// The TZID registered for the VTIMEZONE, if it is a custom one
function registerCustomTimezone(vtimezone: VCalComponent): string[] {
  const tzid = vtimezoneTzid(vtimezone)
  if (!tzid || isMomentZone(tzid) || ICAL.TimezoneService.has(tzid)) {
    return []
  }
  const zone = toIcalTimezone(vtimezone)
  if (!zone) {
    return []
  }
  ICAL.TimezoneService.register(zone, tzid)
  return [tzid]
}

/**
 * Runs `fn` with the custom zones of a calendar object known to ical.js: a
 * VTIMEZONE whose TZID is neither a moment zone nor a registered one ("Customized
 * Time Zone" from Outlook, for example) defines the only offset its values can
 * be read and written in. The zones are registered for the time of the call
 * only: another object may define the same TZID otherwise, and a write that
 * does not carry the stored VTIMEZONE must keep writing such a zone as UTC.
 */
export function withStoredTimezones<T>(
  vtimezones: VCalComponent[],
  fn: () => T
): T {
  const registered = vtimezones.flatMap(registerCustomTimezone)
  try {
    return fn()
  } finally {
    registered.forEach(tzid => ICAL.TimezoneService.remove(tzid))
  }
}

function icalTimezone(timezone: string): ICAL.Timezone | undefined {
  const zone = ICAL.TimezoneService.get(timezone)
  return zone instanceof ICAL.Timezone ? zone : undefined
}

// A change of offset of an ical.js zone; its date is the UTC instant of the
// change (ical.js converts the local onsets of the observances to UTC)
interface ZoneChange {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  utcOffset: number
  prevUtcOffset: number
}

const DAY_MS = 24 * 3600 * 1000

// Undocumented members of ical.js Timezone, checked against ical.js 2.2.1
interface ZoneInternals {
  changes: ZoneChange[]
  _ensureCoverage(year: number): void
}

function zoneInternals(zone: ICAL.Timezone): ZoneInternals | undefined {
  const internals = zone as unknown as Partial<
    Record<keyof ZoneInternals, unknown>
  >
  return typeof internals._ensureCoverage === 'function' &&
    Array.isArray(internals.changes)
    ? zone
    : undefined
}

// The public ical.js API, which reads the UTC clock as a local one: only off
// for the hour that follows a change of offset
function publicOffsetAtInstant(zone: ICAL.Timezone, instantMs: number): number {
  const utcClock = ICAL.Time.fromJSDate(new Date(instantMs), true)
  return zone.utcOffset(utcClock) * 1000
}

/**
 * The UTC offset (in ms) of a stored zone at an instant. ical.js only answers
 * that for a local time, and Time#convertToZone reads the UTC clock as a local
 * one: it keeps the old offset for an hour after each change.
 */
function offsetAtInstant(zone: ICAL.Timezone, instantMs: number): number {
  try {
    return expandedOffsetAtInstant(zone, instantMs)
  } catch {
    // Expanding up to the year of the instant can fail after the registration
    // succeeded, for an earlier year: read it as a zone without a VTIMEZONE
    return 0
  }
}

function expandedOffsetAtInstant(
  zone: ICAL.Timezone,
  instantMs: number
): number {
  if (zone === ICAL.Timezone.utcTimezone) return 0
  const internals = zoneInternals(zone)
  if (!internals) return publicOffsetAtInstant(zone, instantMs)
  internals._ensureCoverage(new Date(instantMs).getUTCFullYear() + 1)
  const changes = internals.changes
  if (!changes.length) return 0
  // The last change at or before the instant (the changes are sorted)
  let low = 0
  let high = changes.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (changeInstant(changes[middle]) <= instantMs) low = middle + 1
    else high = middle
  }
  return (low ? changes[low - 1].utcOffset : changes[0].prevUtcOffset) * 1000
}

const changeInstant = (change: ZoneChange): number =>
  Date.UTC(
    change.year,
    change.month - 1,
    change.day,
    change.hour,
    change.minute,
    change.second
  )

/**
 * The instant (epoch ms) of a wall clock, given as the epoch of the same
 * reading in UTC, in a stored zone. As RFC 5545 3.3.5 requires, a time that
 * occurs twice is its first occurrence, and a time skipped by a change is read
 * with the offset before the change.
 */
function wallClockInZoneToMs(wallClockMs: number, zone: ICAL.Timezone): number {
  const offsetBefore = offsetAtInstant(zone, wallClockMs - DAY_MS)
  const offsetAfter = offsetAtInstant(zone, wallClockMs + DAY_MS)
  const valid = [offsetBefore, offsetAfter]
    .map(offset => wallClockMs - offset)
    .filter(instant => wallClockMs - offsetAtInstant(zone, instant) === instant)
  return valid.length ? Math.min(...valid) : wallClockMs - offsetBefore
}

function wallClockInZoneToISO(
  wallClock: moment.Moment,
  zone: ICAL.Timezone
): string {
  const wallClockMs = Date.UTC(
    wallClock.year(),
    wallClock.month(),
    wallClock.date(),
    wallClock.hours(),
    wallClock.minutes(),
    wallClock.seconds()
  )
  return new Date(wallClockInZoneToMs(wallClockMs, zone)).toISOString()
}

/**
 * The ical.js definition of a zone moment-timezone does not know, while a
 * stored VTIMEZONE defines it (see withStoredTimezones).
 */
export function storedTimezone(
  timezone: string | undefined
): ICAL.Timezone | undefined {
  if (!timezone || isMomentZone(timezone)) return undefined
  return icalTimezone(timezone)
}

const WALL_CLOCK_FORMAT = 'YYYY-MM-DDTHH:mm:ss'

/**
 * The instant of a wall clock value ("2025-08-18T10:00:00") in `timezone`,
 * with the offset of the zone at that instant. A stored custom zone is read
 * with its VTIMEZONE; any other zone with moment-timezone, as before.
 */
export function readWallClock(
  wallClock: string,
  timezone: string
): moment.Moment {
  const zone = storedTimezone(timezone)
  if (!zone) return moment.tz(wallClock, timezone)
  const asUtc = moment.utc(wallClock)
  if (!asUtc.isValid()) return asUtc
  const instantMs = wallClockInZoneToMs(asUtc.valueOf(), zone)
  return moment.utc(instantMs).utcOffset((asUtc.valueOf() - instantMs) / 60000)
}

/**
 * The wall clock reading of an instant in `timezone`. A stored custom zone is
 * converted with its VTIMEZONE; any other zone with moment-timezone.
 */
export function wallClockOf(instant: moment.Moment, timezone: string): string {
  const zone = storedTimezone(timezone)
  if (!zone) return instant.clone().tz(timezone).format(WALL_CLOCK_FORMAT)
  const instantMs = instant.valueOf()
  return moment
    .utc(instantMs + offsetAtInstant(zone, instantMs))
    .format(WALL_CLOCK_FORMAT)
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

  // A zone moment-timezone does not know is read with its ical.js definition
  // (a stored VTIMEZONE, see withStoredTimezones), and as UTC without one.
  // moment-timezone throws on an inherited name such as "constructor".
  const format = detectDateTimeFormat(normalized)
  const knownZone = isMomentZone(timezone)
  const customZone = knownZone ? undefined : icalTimezone(timezone)
  const momentDate = customZone
    ? moment.utc(normalized, format)
    : moment.tz(normalized, format, knownZone ? timezone : 'UTC')
  if (!momentDate.isValid()) {
    console.warn(
      `[convertEventDateTimeToISO] Invalid datetime: "${datetime}" with format "${format}" in timezone "${timezone}"`
    )
    return undefined
  }
  return customZone
    ? wallClockInZoneToISO(momentDate, customZone)
    : momentDate.toISOString()
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
