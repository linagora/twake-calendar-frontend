import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { useState } from 'react'
import { getEvent } from '../Calendars/CalendarSlice'
import { buildDelegatedEventURL } from '../Events/utils/buildDelegatedEventURL'
import { SearchEventResult } from './types/SearchEventResult'
import { userAttendee } from '../User/models/attendee'
import { previewEventIdOf } from './previewEventId'

export function useEventPreview(
  eventData: SearchEventResult,
  calendar: Calendar | undefined
): {
  openPreview: boolean
  setOpenPreview: (b: boolean) => void
  handleOpen: () => Promise<void>
  timeZone: string
  previewEventId: string | undefined
} {
  const dispatch = useAppDispatch()
  const timeZone =
    useAppSelector(state => state.settings.timeZone) ?? browserDefaultTimeZone
  const [openPreview, setOpenPreviewState] = useState(false)
  const [pinnedEventId, setPinnedEventId] = useState<string>()

  const setOpenPreview = (open: boolean): void => {
    setOpenPreviewState(open)
    if (!open) setPinnedEventId(undefined)
  }

  const handleOpen = async (): Promise<void> => {
    if (!calendar) return
    const href = eventData._links.self.href
    const event: CalendarEvent = {
      // search indexes an event under its owner's calendar, which a calendar
      // shared with the user is not read from
      URL: calendar.delegated ? buildDelegatedEventURL(calendar, href) : href,
      calId: calendar.id,
      uid: eventData.data.uid,
      start: eventData.data.start,
      end: eventData.data.end,
      allday: eventData.data.allDay,
      attendee: eventData.data.attendees as userAttendee[],
      class: eventData.data.class,
      description: eventData.data.description,
      stamp: eventData.data.dtstamp,
      location: eventData.data.location,
      organizer: eventData.data.organizer as userAttendee,
      title: eventData.data.summary,
      timezone: timeZone
    }
    setOpenPreview(true)
    await dispatch(getEvent(event))
  }

  // once open, the preview stays on the occurrence it showed first: a later
  // load of other occurrences must not swap it (and an open edit form) away
  const previewEventId =
    pinnedEventId && calendar?.events?.[pinnedEventId]
      ? pinnedEventId
      : previewEventIdOf(calendar, eventData)
  if (openPreview && previewEventId && previewEventId !== pinnedEventId) {
    setPinnedEventId(previewEventId)
  }

  return { openPreview, setOpenPreview, handleOpen, timeZone, previewEventId }
}
