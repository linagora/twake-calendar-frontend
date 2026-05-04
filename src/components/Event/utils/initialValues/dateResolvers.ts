import { CalendarEvent } from '@/features/Events/EventsTypes'
import {
  formatDateTimeInTimezone,
  formatLocalDateTime
} from '@/components/Event/utils/dateTimeFormatters'
import { DateSelectArg } from '@fullcalendar/core'
import { EventFormValues } from '@/components/Event/EventFormFields.types'

/**
 * Formats API date strings into form-compatible strings.
 */
export function formatEventDates(
  event: CalendarEvent,
  isAllDay: boolean,
  eventTimezone: string
): { start: string; end: string } {
  const start = event.start
    ? isAllDay
      ? new Date(event.start).toISOString().split('T')[0]
      : formatDateTimeInTimezone(event.start, eventTimezone)
    : ''

  if (!event.end) {
    return { start, end: '' }
  }

  if (isAllDay) {
    const endDate = new Date(event.end)
    endDate.setDate(endDate.getDate() - 1)
    return { start, end: endDate.toISOString().split('T')[0] }
  }

  return { start, end: formatDateTimeInTimezone(event.end, eventTimezone) }
}

/**
 * Builds initial values from a user-selected range.
 */
export function buildFromSelectedRange(
  selectedRange: DateSelectArg,
  base: Partial<EventFormValues>
): Partial<EventFormValues> {
  const { start, end, allDay, startStr, endStr } = selectedRange

  const startValue = resolveDateValue(start, startStr, allDay)
  let endValue = resolveDateValue(end, endStr, allDay)

  if (allDay) {
    endValue = adjustAllDayEnd(startValue, endValue)
  }

  const isMultipleDays = startValue.slice(0, 10) !== endValue.slice(0, 10)

  return {
    ...base,
    start: startValue,
    end: endValue,
    allday: allDay,
    hasEndDateChanged: isMultipleDays && !allDay
  }
}

/**
 * Resolves the date value from either a string (from FullCalendar) or a Date object.
 */
function resolveDateValue(
  date: Date,
  dateStr: string | undefined,
  allDay: boolean
): string {
  if (dateStr) {
    return allDay ? dateStr.split('T')[0] : dateStr.slice(0, 16)
  }
  return formatLocalDateTime(date) ?? ''
}

/**
 * Internal helper to adjust the end date for all-day selections.
 * FullCalendar sends exclusive end dates; we convert to inclusive for the form.
 */
function adjustAllDayEnd(startValue: string, endValue: string): string {
  const startDateOnly = startValue.slice(0, 10)
  const endDateOnly = endValue.slice(0, 10)

  const daysDiff = Math.floor(
    (new Date(endDateOnly).getTime() - new Date(startDateOnly).getTime()) /
      (1000 * 60 * 60 * 24)
  )

  if (daysDiff <= 1) {
    return startValue
  }

  const adjusted = new Date(endDateOnly)
  adjusted.setDate(adjusted.getDate() - 1)
  return adjusted.toISOString().split('T')[0]
}

/**
 * Builds default initial values for a new event.
 */
export function buildDefaultNewEvent(
  base: Partial<EventFormValues>
): Partial<EventFormValues> {
  const now = new Date()
  const nextHour = new Date(now)
  nextHour.setHours(now.getHours() + 1, 0, 0, 0)

  const endTime = new Date(nextHour)
  endTime.setHours(nextHour.getHours() + 1)

  return {
    ...base,
    start: formatLocalDateTime(nextHour) ?? '',
    end: formatLocalDateTime(endTime) ?? '',
    allday: false
  }
}
