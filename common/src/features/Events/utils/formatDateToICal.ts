import moment from 'moment-timezone'
import {
  isMomentZone,
  storedTimezone,
  wallClockOf
} from '@common/utils/timezone'

// All-day dates travel as UTC midnight: reading them in the zone of the
// browser moves them to the previous day when that zone is behind UTC.
export function formatDateToICal(date: Date): string {
  return moment.utc(date).format('YYYY-MM-DD')
}

export function formatDateTimeToICal(date: Date, timezone?: string): string {
  const pad = (n: number): string => n.toString().padStart(2, '0')

  if (timezone) {
    // Try moment-timezone first (works for most IANA timezones)
    if (isMomentZone(timezone)) {
      const momentDate = moment.utc(date).tz(timezone)
      return momentDate.format('YYYY-MM-DDTHH:mm:ss')
    }

    // A zone only defined by a stored VTIMEZONE (see withStoredTimezones)
    if (storedTimezone(timezone)) {
      return wallClockOf(moment.utc(date), timezone)
    }
  }

  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`
}

const UTC_UNTIL_FORMAT = 'YYYYMMDDTHHmmss[Z]'

// The server gives UNTIL back as it was stored: a DATE ("2025-04-28") or a
// DATE-TIME ("2025-04-28T07:00:00Z"), the form RFC 5545 requires for a
// DTSTART with a TZID.
function hasTimePart(endDate: string): boolean {
  return endDate.includes('T')
}

function hasUtcOffset(endDate: string): boolean {
  return /(Z|[+-]\d{2}:?\d{2})$/i.test(endDate)
}

function formatDateTimeUntil(endDate: string, tzid: string): string {
  const until = hasUtcOffset(endDate)
    ? moment.utc(endDate, moment.ISO_8601)
    : moment.tz(endDate, moment.ISO_8601, tzid)
  return until.utc().format(UTC_UNTIL_FORMAT)
}

export function formatUntilForRRule(
  endDate: string,
  allday: boolean,
  tzid: string
): string {
  if (allday) {
    return endDate.split('T')[0].replace(/-/g, '')
  }

  // A DATE-TIME UNTIL is kept as is: moving it to the end of the day could
  // add an occurrence the series did not have.
  if (hasTimePart(endDate)) {
    return formatDateTimeUntil(endDate, tzid)
  }

  // A date picked in the form ends at the end of that day, in the series zone
  return moment.tz(`${endDate}T23:59:59`, tzid).utc().format(UTC_UNTIL_FORMAT)
}
