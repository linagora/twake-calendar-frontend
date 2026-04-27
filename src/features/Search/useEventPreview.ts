import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { browserDefaultTimeZone } from '@/utils/timezone'
import { useState } from 'react'
import { getEventAsync } from '../Calendars/services'
import { CalendarEvent } from '../Events/EventsTypes'
import { SearchEventResult } from './types/SearchEventResult'

export function useEventPreview(
  eventData: SearchEventResult,
  calendar: Calendar | undefined
): {
  openPreview: boolean
  setOpenPreview: (b: boolean) => void
  handleOpen: () => Promise<void>
  timeZone: string
} {
  const dispatch = useAppDispatch()
  const timeZone =
    useAppSelector(state => state.settings.timeZone) ?? browserDefaultTimeZone
  const [openPreview, setOpenPreview] = useState(false)

  const handleOpen = async (): Promise<void> => {
    if (!calendar) return
    const event: CalendarEvent = {
      URL: eventData._links.self.href,
      calId: calendar.id,
      uid: eventData.data.uid,
      start: eventData.data.start,
      end: eventData.data.end,
      allday: eventData.data.allDay,
      attendee: eventData.data.attendees,
      class: eventData.data.class,
      description: eventData.data.description,
      stamp: eventData.data.dtstamp,
      location: eventData.data.location,
      organizer: eventData.data.organizer,
      title: eventData.data.summary,
      timezone: timeZone
    }
    await dispatch(getEventAsync(event))
    setOpenPreview(true)
  }

  return { openPreview, setOpenPreview, handleOpen, timeZone }
}
