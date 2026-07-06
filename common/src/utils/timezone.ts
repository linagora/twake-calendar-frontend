// timezone.ts

// Ensure ICAL is imported before using this module.
import ICAL from 'ical.js'
import moment from 'moment-timezone'
import { detectDateTimeFormat } from '@common/components/Event/utils/dateTimeHelpers'

// TIMEZONES data must be imported or defined separately.
import { TIMEZONES } from './timezone-data'

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
  if (TIMEZONES.zones[tzid]) {
    return buildTimezone(tzid, TIMEZONES.zones[tzid].ics)
  }

  const alias = TIMEZONES.aliases[tzid]
  if (alias && alias.aliasTo) {
    return findTimezone(alias.aliasTo)
  }

  throw new Error(`Unknown timezone alias: ${tzid}`)
}

export function resolveTimezone(tzName: string): string {
  if (TIMEZONES.zones[tzName]) {
    return tzName
  }
  if (TIMEZONES.aliases[tzName]) {
    return TIMEZONES.aliases[tzName].aliasTo
  }
  return tzName
}

export function resolveTimezoneId(tzid?: string): string | undefined {
  if (!tzid) return undefined
  return resolveTimezone(tzid)
}

export function convertEventDateTimeToISO(
  datetime: string | undefined,
  timezone: string,
  options?: { isAllDay?: boolean }
): string | undefined {
  if (!datetime || !timezone) return undefined
  if (options?.isAllDay) return undefined

  let normalized = datetime
  const match = datetime.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z|[+-]\d{2}:?\d{2})?$/
  )
  if (match) {
    const [, year, month, day, hour, min, sec, tz] = match
    let tzFormatted = tz ?? ''
    if (tz && tz !== 'Z' && !tz.includes(':')) {
      tzFormatted = tz.slice(0, 3) + ':' + tz.slice(3)
    }
    normalized = `${year}-${month}-${day}T${hour}:${min}${sec ? `:${sec}` : ''}${tzFormatted}`
  }

  if (normalized.includes('Z') || normalized.match(/[+-]\d{2}:\d{2}$/)) {
    return normalized
  }

  const dateOnlyRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
  if (dateOnlyRegex.test(normalized)) {
    return undefined
  }

  const format = detectDateTimeFormat(normalized)
  const momentDate = moment.tz(normalized, format, timezone)
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
  const fmt = new Intl.DateTimeFormat(undefined, {
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
