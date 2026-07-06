import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { push } from 'redux-first-history'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { Loading } from '@common/components/Loading/Loading'
import { PENDING_EVENT_UID_KEY } from './eventDeepLinkUtils'

/**
 * Handles the /events/:uid deep link: it remembers the requested event UID and
 * routes the user to the calendar page (through the login flow when needed), so
 * the event preview modal can be opened once everything is loaded.
 */
export default function EventDeepLink(): JSX.Element {
  const { uid } = useParams<{ uid: string }>()
  const dispatch = useAppDispatch()
  const tokens = useAppSelector(state => state.user.tokens)
  const userId = useAppSelector(state => state.user.userData?.openpaasId)

  useEffect(() => {
    if (uid) {
      sessionStorage.setItem(PENDING_EVENT_UID_KEY, uid)
    }
    dispatch(push(tokens && userId ? '/calendar' : '/'))
  }, [uid, tokens, userId, dispatch])

  return <Loading />
}
