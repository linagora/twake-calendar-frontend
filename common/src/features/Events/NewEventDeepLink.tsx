import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { push } from 'redux-first-history'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { Loading } from '@common/components/Loading/Loading'
import {
  PENDING_NEW_EVENT_ATTENDEES_KEY,
  parseNewEventAttendees
} from './newEventDeepLinkUtils'

/**
 * Handles the /newEvent?attendee=xxx@yyy.com deep link: it remembers the
 * requested attendee(s) and routes the user to the calendar page (through the
 * login flow when needed), so a new event can be opened with the attendee(s)
 * prefilled once everything is loaded.
 */
export default function NewEventDeepLink(): JSX.Element {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const tokens = useAppSelector(state => state.user.tokens)
  const userId = useAppSelector(state => state.user.userData?.openpaasId)

  useEffect(() => {
    const attendees = parseNewEventAttendees(
      new URLSearchParams(location.search)
    )
    if (attendees.length > 0) {
      sessionStorage.setItem(
        PENDING_NEW_EVENT_ATTENDEES_KEY,
        JSON.stringify(attendees)
      )
    }
    dispatch(push(tokens && userId ? '/calendar' : '/'))
  }, [location.search, tokens, userId, dispatch])

  return <Loading />
}
