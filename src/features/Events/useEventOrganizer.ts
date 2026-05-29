import { makeDisplayName } from '@/utils/makeDisplayName'
import { useMemo } from 'react'
import { Calendar } from '../Calendars/CalendarTypes'
import { userOrganiser } from '../User/userDataTypes'

// Update event organizer accordingly to selected calendar's delegated status
export function useEventOrganizer({
  calendarid,
  eventId,
  calList,
  userOrganizer
}: {
  calendarid: string
  eventId: string | null | undefined
  calList: Record<string, Calendar>
  userOrganizer: userOrganiser
}): {
  organizer: userOrganiser
  selectedCalendar: Calendar
  isOrganizer: boolean
} {
  const selectedCalendar = useMemo(
    () => calList?.[calendarid],
    [calList, calendarid]
  )

  const organizer = useMemo(() => {
    if (selectedCalendar?.delegated && selectedCalendar?.owner) {
      return {
        cn:
          makeDisplayName(selectedCalendar) ??
          selectedCalendar.owner.emails?.[0] ??
          '',
        cal_address: selectedCalendar.owner.emails?.[0] ?? ''
      }
    }
    return userOrganizer
  }, [selectedCalendar, userOrganizer])

  const isOrganizer = useMemo(() => {
    if (!eventId) return false
    return (
      selectedCalendar?.events[eventId]?.organizer?.cal_address ===
      organizer?.cal_address
    )
  }, [selectedCalendar, eventId, organizer?.cal_address])

  return { organizer, selectedCalendar, isOrganizer }
}
