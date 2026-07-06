import { useEffect, useRef } from 'react'
import { AppDispatch } from '@common/app/store'
import { getEventByUid } from '@common/features/Calendars/CalendarSlice'
import { PENDING_EVENT_UID_KEY } from '@common/features/Events/eventDeepLinkUtils'
import { Calendar } from '@common/types/CalendarTypes'

interface UseOpenEventFromUrlProps {
  userId: string
  calendars: Record<string, Calendar>
  dispatch: AppDispatch
  setEventDisplayedId: (id: string) => void
  setEventDisplayedCalId: (calId: string) => void
  setEventDisplayedTemp: (temp: boolean) => void
  setOpenEventDisplay: (open: boolean) => void
}

/**
 * When the user reaches the calendar page after following a /events/:uid deep
 * link, resolves the event from its UID and opens the preview modal on top of
 * the default calendar view.
 */
export function useOpenEventFromUrl({
  userId,
  calendars,
  dispatch,
  setEventDisplayedId,
  setEventDisplayedCalId,
  setEventDisplayedTemp,
  setOpenEventDisplay
}: UseOpenEventFromUrlProps): void {
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current || !userId) {
      return
    }
    const pendingUid = sessionStorage.getItem(PENDING_EVENT_UID_KEY)
    if (!pendingUid) {
      return
    }
    // Wait for the user's calendars to be loaded so the event can be attached
    // to an existing calendar in the store.
    if (Object.keys(calendars).length === 0) {
      return
    }

    processedRef.current = true
    sessionStorage.removeItem(PENDING_EVENT_UID_KEY)

    void (async () => {
      try {
        const result = await dispatch(
          getEventByUid({ userId, uid: pendingUid })
        ).unwrap()
        if (!result || !calendars[result.calId]) {
          return
        }
        const target =
          result.events.find(event => event.uid === pendingUid) ??
          result.events[0]
        if (!target) {
          return
        }
        setEventDisplayedId(target.uid)
        setEventDisplayedCalId(result.calId)
        setEventDisplayedTemp(false)
        setOpenEventDisplay(true)
      } catch {
        // Silently ignore: an unresolved deep link should not break the page.
      }
    })()
  }, [
    userId,
    calendars,
    dispatch,
    setEventDisplayedId,
    setEventDisplayedCalId,
    setEventDisplayedTemp,
    setOpenEventDisplay
  ])
}
