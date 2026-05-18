import moment from 'moment-timezone'
import ICAL from 'ical.js'

export function formatDateToICal(
  date: Date,
  allday: boolean,
  timezone?: string
): string {
  const pad = (n: number): string => n.toString().padStart(2, '0')

  if (allday) {
    const year = date.getUTCFullYear()
    const month = pad(date.getUTCMonth() + 1)
    const day = pad(date.getUTCDate())
    return `${year}-${month}-${day}`
  }

  if (timezone) {
    // Try moment-timezone first (works for most IANA timezones)
    if (moment.tz.zone(timezone)) {
      const momentDate = moment.utc(date).tz(timezone)
      return momentDate.format('YYYY-MM-DDTHH:mm:ss')
    }

    // Fallback: use ICAL.js which has all timezones registered
    try {
      const tz = ICAL.TimezoneService.get(timezone)
      if (tz) {
        const icalTime = new ICAL.Time(
          {
            year: date.getUTCFullYear(),
            month: date.getUTCMonth() + 1,
            day: date.getUTCDate(),
            hour: date.getUTCHours(),
            minute: date.getUTCMinutes(),
            second: date.getUTCSeconds(),
            isDate: false
          },
          ICAL.Timezone.utcTimezone
        )
        const converted = icalTime.convertToZone(tz)
        return (
          [
            String(converted.year).padStart(4, '0'),
            pad(converted.month),
            pad(converted.day)
          ].join('-') +
          'T' +
          [
            pad(converted.hour),
            pad(converted.minute),
            pad(converted.second)
          ].join(':')
        )
      }
    } catch {
      // fall through to UTC
    }
  }

  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`
}
