import type { EventApi } from '@fullcalendar/core'
import type { EventImpl } from '@fullcalendar/core/internal'

export const isVisibleInRange = (
  event: EventApi,
  activeStart: Date,
  activeEnd: Date
): boolean => {
  const start = event.start
  if (!start || event.display === 'none') return false

  // FullCalendar stores its configured default end in the instance range even
  // when the public end is null. Convert its date marker through the calendar's
  // date environment so named time zones and all-day durations stay consistent.
  const internalEvent = event as EventImpl
  const end =
    event.end ??
    (internalEvent._instance
      ? internalEvent._context.dateEnv.toDate(internalEvent._instance.range.end)
      : null)
  return !!end && start < activeEnd && end > activeStart
}
