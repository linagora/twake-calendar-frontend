import { useMemo } from 'react'
import { Calendar } from '@common/types/CalendarTypes'
import { withoutOtherResourceCalendars } from '@common/features/Calendars/utils/calendarPermissions'

/**
 * Filters a list of calendars to return only those the user owns or has write access to.
 */
export function useUserPersonalCalendars(
  calList: Record<string, Calendar>,
  openpaasId: string | undefined
): Calendar[] {
  return useMemo(() => {
    return Object.values(calList ?? {}).filter((cal: Calendar) => {
      const isOwner = cal.id?.split('/')[0] === openpaasId
      const hasWriteAccess = cal.delegated && cal.access?.write
      return isOwner || hasWriteAccess
    })
  }, [calList, openpaasId])
}

/**
 * The calendars an existing event may be kept in or moved to: those the user
 * may write into, without the resource calendars but the one the event is in.
 */
export function useEventTargetCalendars(
  calList: Record<string, Calendar>,
  openpaasId: string | undefined,
  currentCalendarId: string | undefined
): Calendar[] {
  const writableCalendars = useUserPersonalCalendars(calList, openpaasId)
  return useMemo(
    () => withoutOtherResourceCalendars(writableCalendars, currentCalendarId),
    [writableCalendars, currentCalendarId]
  )
}
