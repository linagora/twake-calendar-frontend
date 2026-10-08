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
  // The event of the embed route, in place of the one a deep link saved
  uid?: string | null
}

/**
 * When the user reaches the calendar page after following a /events/:uid deep
 * link, resolves the event from its UID and opens the preview modal on top of
 * the default calendar view. On the embed route, opens each event its URL
 * shows.
 */
export function useOpenEventFromUrl({
  userId,
  calendars,
  dispatch,
  setEventDisplayedId,
  setEventDisplayedCalId,
  setEventDisplayedTemp,
  setOpenEventDisplay,
  uid
}: UseOpenEventFromUrlProps): void {
  const processedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) {
      return
    }
    const pendingUid = uid ?? sessionStorage.getItem(PENDING_EVENT_UID_KEY)
    if (!pendingUid) {
      // The same event may be opened again once its preview is closed
      processedRef.current = null
      return
    }
    if (processedRef.current === pendingUid) {
      return
    }
    // Wait for the user's calendars to be loaded so the event can be attached
    // to an existing calendar in the store.
    if (Object.keys(calendars).length === 0) {
      return
    }

    processedRef.current = pendingUid
    if (!uid) sessionStorage.removeItem(PENDING_EVENT_UID_KEY)

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
        // An unresolved deep link should not break the page: the thunk already
        // reports the failure (e.g. a translated "event not found") to the user.
      }
    })()
  }, [
    userId,
    calendars,
    dispatch,
    setEventDisplayedId,
    setEventDisplayedCalId,
    setEventDisplayedTemp,
    setOpenEventDisplay,
    uid
  ])
}
