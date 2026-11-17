import { useMemo } from 'react'
import { useSelectedCalendars } from '@common/utils/storage/useSelectedCalendars'
import { Calendar } from '@common/types/CalendarTypes'
import { canHoldUserEvents } from '@common/features/Calendars/utils/calendarPermissions'
import { useEmbeddedCalendarId } from '@common/features/Embed/embeddedCalendar'

interface UseDefaultCalendarIdParams {
  calId?: string
  calList: Record<string, Calendar>
  userId: string
}

/**
 * Hook to determine the default writable calendar ID.
 */
export function useDefaultCalendarId({
  calId,
  calList,
  userId
}: UseDefaultCalendarIdParams): string {
  const selectedCalendarIds = useSelectedCalendars()
  const embeddedCalendarId = useEmbeddedCalendarId()

  return useMemo(() => {
    if (calId) return calId
    // A space creates its events on its team calendar
    if (embeddedCalendarId && calList?.[embeddedCalendarId]) {
      return embeddedCalendarId
    }

    const calendars = Object.values(calList ?? {})

    const selectedAndWritable = calendars.filter(
      cal =>
        selectedCalendarIds.includes(cal.id) && canHoldUserEvents(cal, userId)
    )

    if (selectedAndWritable.length > 0) {
      return selectedAndWritable[0].id
    }

    const firstPersonal = calendars.find(cal => canHoldUserEvents(cal, userId))

    return firstPersonal?.id ?? ''
  }, [selectedCalendarIds, calList, userId, calId, embeddedCalendarId])
}
