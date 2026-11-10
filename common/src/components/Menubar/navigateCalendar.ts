import type { CalendarApi } from '@fullcalendar/react'

export function navigateCalendar(
  calendar: CalendarApi | null,
  action: 'prev' | 'next' | 'today',
  onDateChange?: (date: Date) => void
): void {
  if (!calendar) return
  calendar[action]()
  onDateChange?.(calendar.getDate())
}
