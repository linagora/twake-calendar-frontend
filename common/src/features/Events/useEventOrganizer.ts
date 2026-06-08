import { makeDisplayName } from '@common/utils/makeDisplayName'
import { useMemo } from 'react'
import { Calendar } from '@common/types/CalendarTypes'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { CalendarEvent } from '@common/types/EventsTypes'

// Update event organizer accordingly to selected calendar's delegated status
export function useEventOrganizer({
  calendarid,
  eventId,
  calList,
  userOrganizer,
  event
}: {
  calendarid: string
  eventId: string | null | undefined
  calList: Record<string, Calendar>
  userOrganizer: userOrganiser
  event?: CalendarEvent | null
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
    const eventOrganizer =
      event?.organizer ?? selectedCalendar?.events[eventId]?.organizer
    return eventOrganizer?.cal_address === organizer?.cal_address
  }, [event, selectedCalendar, eventId, organizer?.cal_address])

  return { organizer, selectedCalendar, isOrganizer }
}
