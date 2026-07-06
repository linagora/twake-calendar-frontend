import { useEffect, useRef } from 'react'
import { PENDING_NEW_EVENT_ATTENDEES_KEY } from '@common/features/Events/newEventDeepLinkUtils'
import { userAttendee } from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'

interface UseOpenNewEventFromUrlProps {
  userId: string
  calendars: Record<string, Calendar>
  setTempEvent: (event: CalendarEvent) => void
  setAnchorEl: (el: HTMLElement | null) => void
}

const parsePendingAttendees = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((email): email is string => typeof email === 'string')
      : []
  } catch {
    return []
  }
}

/**
 * When the user reaches the calendar page after following a
 * /newEvent?attendee=xxx@yyy.com deep link, opens the create event modal with
 * the requested attendee(s) prefilled.
 */
export function useOpenNewEventFromUrl({
  userId,
  calendars,
  setTempEvent,
  setAnchorEl
}: UseOpenNewEventFromUrlProps): void {
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current || !userId) {
      return
    }
    const raw = sessionStorage.getItem(PENDING_NEW_EVENT_ATTENDEES_KEY)
    if (!raw) {
      return
    }
    // Wait for the user's calendars to be loaded so the create modal can offer
    // a calendar to save the event into.
    if (Object.keys(calendars).length === 0) {
      return
    }

    processedRef.current = true
    sessionStorage.removeItem(PENDING_NEW_EVENT_ATTENDEES_KEY)

    const emails = parsePendingAttendees(raw)
    if (emails.length === 0) {
      return
    }

    setTempEvent({
      start: '',
      end: '',
      allday: false,
      attendee: emails.map(
        email =>
          new userAttendee({ cal_address: email, cn: email, rsvp: 'TRUE' })
      )
    } as CalendarEvent)
    setAnchorEl(document.body)
  }, [userId, calendars, setTempEvent, setAnchorEl])
}
