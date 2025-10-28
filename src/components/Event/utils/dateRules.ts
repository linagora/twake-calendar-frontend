// Date rules helpers to normalize end date/time behavior

import { combineDateTime } from "./dateTimeHelpers";

/** Adds a number of days to a YYYY-MM-DD string and returns YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Compute endDate (YYYY-MM-DD) when startDate changes
 * - If all-day: endDate = startDate + 1 day
 * - Else: endDate = startDate
 */
export function getEndDateForStartChange(
  startDate: string,
  isAllDay: boolean
): string {
  if (!startDate) return "";
  return isAllDay ? addDays(startDate, 1) : startDate;
}

/**
 * Compute new start/end (ISO-like strings) when toggling all-day
 * - nextAllDay = true:
 *   - If fromAllDaySlot: endDate = startDate
 *   - Else: endDate = startDate + 1 day
 *   - Times are cleared (date-only)
 * - nextAllDay = false:
 *   - end restored from originalEndDate if any, else previousEndDate, else start
 */
export function getEndDateForToggle(params: {
  nextAllDay: boolean;
  fromAllDaySlot?: boolean;
  startDate: string;
  previousEndDate: string;
  originalEndDate?: string;
}): string {
  const {
    nextAllDay,
    fromAllDaySlot,
    startDate,
    previousEndDate,
    originalEndDate,
  } = params;
  if (nextAllDay) {
    return fromAllDaySlot ? startDate : addDays(startDate, 1);
  }
  return originalEndDate || previousEndDate || startDate;
}

/** Utility to combine date with a fallback time (HH:mm) safely */
export function combineWithFallback(
  dateStr: string,
  timeHHmm: string | undefined,
  fallbackTime: string
): string {
  const time = timeHHmm && timeHHmm.trim() ? timeHHmm : fallbackTime;
  return combineDateTime(dateStr, time);
}
