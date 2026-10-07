import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/de'
import 'dayjs/locale/it'
import 'dayjs/locale/ru'
import 'dayjs/locale/vi'
import { getTimezoneOffset } from '@common/utils/timezone'

/**
 * Date/time formatting utilities
 */

/**
 * Format a Date object to local datetime string (YYYY-MM-DDTHH:mm)
 * @param date - Date object to format
 * @param timeZone - Optional timezone for formatting
 * @returns Formatted datetime string
 */
export function formatLocalDateTime(date: Date, timeZone?: string): string {
  // Guard against invalid or undefined dates
  if (!date || isNaN(date.getTime())) {
    return ''
  }

  if (timeZone) {
    return formatDateTimePartsInTimezone(date, timeZone)
  }

  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Read the numeric date/time fields of a Date as seen in a timezone.
 * Relies on formatToParts: the layout returned by format() depends on the
 * engine's CLDR data (WebKit renders 'en-CA' as MM/DD/YYYY), so it must
 * never be parsed.
 */
function getDateTimePartsInTimezone(
  date: Date,
  timeZone: string
): Record<'year' | 'month' | 'day' | 'hour' | 'minute', string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const getValue = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find(p => p.type === type)?.value || ''

  return {
    year: getValue('year'),
    month: getValue('month'),
    day: getValue('day'),
    // Some engines still render midnight as 24 despite hourCycle h23
    hour: getValue('hour') === '24' ? '00' : getValue('hour'),
    minute: getValue('minute')
  }
}

function formatDateTimePartsInTimezone(date: Date, timeZone: string): string {
  const { year, month, day, hour, minute } = getDateTimePartsInTimezone(
    date,
    timeZone
  )
  return `${year}-${month}-${day}T${hour}:${minute}`
}

/**
 * Format the calendar day of a Date as seen in a timezone
 * @param date - Date object to format
 * @param timeZone - Target timezone
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatDateInTimezone(date: Date, timeZone: string): string {
  const { year, month, day } = getDateTimePartsInTimezone(date, timeZone)
  return `${year}-${month}-${day}`
}

/**
 * Format an ISO datetime string in a specific timezone
 * @param isoString - ISO datetime string
 * @param timezone - Target timezone
 * @returns Formatted datetime string in target timezone
 */
export function formatDateTimeInTimezone(
  isoString: string,
  timezone: string
): string {
  return formatDateTimePartsInTimezone(new Date(isoString), timezone)
}

/**
 * Get current time rounded to nearest 30 minutes
 * @returns Rounded Date object
 */
export function getRoundedCurrentTime(): Date {
  const now = new Date()
  const minutes = now.getMinutes()
  const roundedMinutes = minutes < 30 ? 0 : 30
  now.setMinutes(roundedMinutes)
  now.setSeconds(0)
  now.setMilliseconds(0)
  return now
}

/** Long date display format for date pickers */
export const LONG_DATE_FORMAT = 'dddd, MMMM D, YYYY'

const LOCALIZED_LONG_DATE_FORMATS: Record<string, string> = {
  fr: 'dddd D MMMM YYYY',
  es: 'dddd, D [de] MMMM [de] YYYY',
  de: 'dddd, D. MMMM YYYY',
  it: 'dddd D MMMM YYYY',
  ru: 'dddd, D MMMM YYYY',
  vi: 'dddd, D MMMM, YYYY'
}

/**
 * Long date display format following the day/month ordering of the locale
 * @param locale - Language code (en, fr, es, de, it, ru, vi)
 * @returns dayjs format string
 */
export function getLongDateFormat(locale?: string): string {
  return (locale && LOCALIZED_LONG_DATE_FORMATS[locale]) || LONG_DATE_FORMAT
}

/**
 * Format date with current locale.
 * @param dateStr - Date string to format
 * @param lang - Language code
 * @param options.capitalize - Upper-case the leading French, Spanish, Italian,
 *   Russian or Vietnamese weekday, as wanted for standalone labels. Set to false when the
 *   date is inserted mid-sentence, where those languages write the weekday in
 *   lowercase.
 * @returns Formatted date string
 */
export function formatLocalizedDate(
  dateStr: string,
  lang?: string,
  { capitalize = true }: { capitalize?: boolean } = {}
): string {
  if (!dateStr) return ''
  const date = dayjs(dateStr)
  const locale =
    lang && ['en', 'vi', 'fr', 'es', 'de', 'it', 'ru'].includes(lang)
      ? lang
      : 'en'

  const formatted = date.locale(locale).format(getLongDateFormat(locale))
  if (capitalize && ['fr', 'es', 'it', 'ru', 'vi'].includes(locale)) {
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }
  return formatted
}

/**
 * Format timezone with offset
 * @param tz - Timezone string
 * @param dateStr - Optional date string to calculate offset for correct DST
 * @returns Formatted timezone string
 */
export function formatTimezoneWithOffset(tz: string, dateStr?: string): string {
  if (!tz) return ''
  try {
    const dateForOffset = dateStr ? dayjs(dateStr).toDate() : new Date()
    const offset = getTimezoneOffset(tz, dateForOffset)
    const tzName = tz.replace(/_/g, ' ')
    return `(${offset}) ${tzName}`
  } catch {
    return tz.replace(/_/g, ' ')
  }
}
