import { BusinessHour } from './SettingsSlice'

/**
 * Working days are handled internally in FullCalendar convention
 * (0=Sunday, 1=Monday ... 6=Saturday), while the backend expects the
 * ISO-8601 day-of-week numbering (1=Monday ... 7=Sunday). Only Sunday
 * differs between the two conventions, the other days share the same value.
 *
 * These helpers convert `businessHours.daysOfWeek` at the API boundary so that
 * Sunday can be persisted (and read back) correctly. Sending Sunday as `0`
 * makes the backend reject the value (`DayOfWeek.of(0)` is invalid), which
 * previously prevented creating a booking link when Sunday was a working day.
 */

const fcToIso = (day: number): number => (day === 0 ? 7 : day)
const isoToFc = (day: number): number => (day === 7 ? 0 : day)

export function businessHoursToIso(
  businessHours: BusinessHour | null
): BusinessHour | null {
  if (!businessHours) return businessHours
  return {
    ...businessHours,
    daysOfWeek: businessHours.daysOfWeek.map(fcToIso)
  }
}

export function businessHoursFromIso(
  businessHours: BusinessHour | null
): BusinessHour | null {
  if (!businessHours) return businessHours
  return {
    ...businessHours,
    daysOfWeek: businessHours.daysOfWeek.map(isoToFc)
  }
}
