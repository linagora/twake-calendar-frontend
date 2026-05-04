import { useMemo } from 'react'
import { useSelectedCalendars } from '@/utils/storage/useSelectedCalendars'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { canWriteToCalendar } from '@/features/Calendars/utils/calendarPermissions'

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

  return useMemo(() => {
    if (calId) return calId

    const calendars = Object.values(calList ?? {})

    const selectedAndWritable = calendars.filter(
      cal =>
        selectedCalendarIds.includes(cal.id) && canWriteToCalendar(cal, userId)
    )

    if (selectedAndWritable.length > 0) {
      return selectedAndWritable[0].id
    }

    const firstPersonal = calendars.find(cal => canWriteToCalendar(cal, userId))

    return firstPersonal?.id ?? ''
  }, [selectedCalendarIds, calList, userId, calId])
}
