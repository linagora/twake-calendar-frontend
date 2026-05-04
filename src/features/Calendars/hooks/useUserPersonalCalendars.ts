import { useMemo } from 'react'
import { Calendar } from '@/features/Calendars/CalendarTypes'

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
