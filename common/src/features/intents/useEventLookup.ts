import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { getEventByUid } from '@common/features/Calendars/CalendarSlice'
import type { RejectedError } from '@common/features/Calendars/types/RejectedError'
import type { Calendar } from '@common/types/CalendarTypes'
import type { CalendarEvent } from '@common/types/EventsTypes'
import { useEffect, useRef, useState } from 'react'
import {
  failedLookup,
  foundLookup,
  type EventLookup,
  type ExpectedEvent
} from './openEventIntent'

/**
 * Looks the event up by its UID in the calendars of the user, once, with
 * the thunk of the `/events/:uid` link (getEventByUid, which puts it in the
 * store). In an Effect, as it talks to the calendar server; the ref keeps it
 * to once under StrictMode. Used by OpenEventIntentPage.
 */
export function useEventLookup(
  uid: string,
  expected: ExpectedEvent | null
): EventLookup {
  const dispatch = useAppDispatch()
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const email = useAppSelector(state => state.user.userData.email)
  const [lookup, setLookup] = useState<EventLookup>({ status: 'loading' })
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    dispatch(getEventByUid({ userId, uid }))
      .unwrap()
      .then(found => setLookup(foundLookup(found, uid, email, expected)))
      // unwrap rejects with the rejected value of the thunk
      .catch((error: unknown) =>
        setLookup(failedLookup(error as RejectedError | undefined))
      )
  }, [dispatch, userId, email, uid, expected])
  return lookup
}

/**
 * The event the lookup found and its calendar, read live from the store
 * with useAppSelector: a reply sent updates them. Used by
 * OpenEventIntentPage.
 */
export function useFoundEvent(
  lookup: EventLookup
): [CalendarEvent | undefined, Calendar | undefined] {
  const calendar = useAppSelector(state =>
    lookup.status === 'found' ? state.calendars.list[lookup.calId] : undefined
  )
  const event =
    lookup.status === 'found' ? calendar?.events[lookup.eventId] : undefined
  return [event, calendar]
}
