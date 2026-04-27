import { Calendar } from '@/features/Calendars/CalendarTypes'

export type NormalizedColor = { light: string; dark: string }
export type NormalizedCalendar = Omit<Calendar, 'color'> & {
  color: NormalizedColor
}

/**
 * EventChip expects calendar.color to be { light: string; dark: string }.
 * The Redux store may hold color as a plain string — normalize it here.
 */
export function normalizeCalendarColor(
  color: Calendar['color']
): NormalizedColor {
  if (
    color &&
    typeof color === 'object' &&
    'light' in color &&
    'dark' in color
  ) {
    return color as NormalizedColor
  }
  const hex = typeof color === 'string' ? color : '#ffffff'
  return { light: hex, dark: hex }
}

/**
 * Returns a copy of the calendars map with every color normalized to { light, dark }.
 */
export function normalizeCalendars(
  calendars: Record<string, Calendar>
): Record<string, NormalizedCalendar> {
  return Object.fromEntries(
    Object.entries(calendars).map(([key, cal]) => [
      key,
      { ...cal, color: normalizeCalendarColor(cal.color) }
    ])
  )
}
