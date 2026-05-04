/**
 * Pure utility functions for converting form date/time strings into ISO 8601
 * strings suitable for the CalDAV API.
 *
 * Both EventModal (create) and EventUpdateModal (update) duplicate these
 * all-day / timed-event conversions — centralising them here removes the
 * duplication and makes the logic independently testable.
 */

import { addDays } from './dateRules'
import { convertFormDateTimeToISO } from './dateTimeHelpers'

/**
 * Convert form start/end date strings for an all-day event into UTC ISO
 * strings expected by the API (end = UI end + 1 day, both at UTC midnight).
 */
export function resolveAllDayISORange(
  start: string,
  end: string
): { startISO: string; endISO: string } {
  const startDateOnly = (start || '').split('T')[0]
  const endDateOnlyUI = (end || start || '').split('T')[0]
  const endDateOnlyAPI = addDays(endDateOnlyUI, 1)

  const [startYear, startMonth, startDay] = startDateOnly.split('-').map(Number)
  const [endYear, endMonth, endDay] = endDateOnlyAPI.split('-').map(Number)

  const startISO = new Date(
    Date.UTC(startYear, startMonth - 1, startDay)
  ).toISOString()
  const endISO = new Date(Date.UTC(endYear, endMonth - 1, endDay)).toISOString()

  return { startISO, endISO }
}

export interface ResolveTimedISORangeParams {
  start: string
  end: string
  timezone: string
  showMore: boolean
  hasEndDateChanged: boolean
}

/**
 * Convert form start/end datetime strings for a timed event into UTC ISO
 * strings expected by the API.
 *
 * In collapsed (normal) mode, when the user has not explicitly changed the
 * end date, the end time is kept on the same calendar date as start.
 */
export function resolveTimedISORange({
  start,
  end,
  timezone,
  showMore,
  hasEndDateChanged
}: ResolveTimedISORangeParams): { startISO: string; endISO: string } {
  const startISO = convertFormDateTimeToISO(start, timezone)

  const startDateOnly = (start || '').split('T')[0]
  const endDateOnly = (end || '').split('T')[0]
  const sameDay = startDateOnly === endDateOnly
  const collapseEnd = !showMore && !hasEndDateChanged && sameDay

  let endISO: string
  if (collapseEnd) {
    const endTimeOnly = end.includes('T')
      ? (end.split('T')[1]?.slice(0, 5) ?? '00:00')
      : '00:00'
    endISO = convertFormDateTimeToISO(
      `${startDateOnly}T${endTimeOnly}`,
      timezone
    )
  } else {
    endISO = convertFormDateTimeToISO(end, timezone)
  }

  return { startISO, endISO }
}

export interface ResolveEventISORangeParams {
  start: string
  end: string
  allday: boolean
  timezone: string
  showMore: boolean
  hasEndDateChanged: boolean
}

/**
 * Top-level dispatcher: choose all-day or timed conversion based on `allday`.
 */
export function resolveEventISORange({
  start,
  end,
  allday,
  timezone,
  showMore,
  hasEndDateChanged
}: ResolveEventISORangeParams): { startISO: string; endISO: string } {
  if (allday) {
    return resolveAllDayISORange(start, end)
  }
  return resolveTimedISORange({
    start,
    end,
    timezone,
    showMore,
    hasEndDateChanged
  })
}
