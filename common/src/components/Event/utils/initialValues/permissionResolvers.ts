import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { canHoldUserEvents } from '@common/features/Calendars/utils/calendarPermissions'

export interface ResolveFormCalendarIdParams {
  event: CalendarEvent
  calList: Record<string, Calendar>
  userId: string
  defaultCalendarId: string
  calId?: string
}

/**
 * Determines the target calendar ID based on permissions.
 */
export function resolveFormCalendarId({
  event,
  calList,
  userId,
  defaultCalendarId,
  calId
}: ResolveFormCalendarIdParams): string {
  if (calId) return calId

  const eventCalId = event.calId
  const sourceCalendar = eventCalId ? calList[eventCalId] : null

  if (sourceCalendar && canHoldUserEvents(sourceCalendar, userId)) {
    return eventCalId
  }

  return defaultCalendarId
}
