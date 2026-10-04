import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { Auth } from '@common/features/User/oidcAuth'
import {
  getOpenPaasUserData,
  setUserError
} from '@common/features/User/UserSlice'
import { getAccessToken, redirectTo } from '@common/utils/apiUtils'
import { getRetryDelay } from '@common/utils/getRetryDelay'
import { useEffect, useRef } from 'react'
import { push } from 'redux-first-history'
import { getCalendarsList } from '../Calendars/CalendarSlice'

const SSO_ATTEMPTS = 3
const SSO_RETRY_BACKOFF = { initialDelay: 1000, maxDelay: 5000 }

export const SSO_UNREACHABLE_ERROR = 'TRANSLATION:error.ssoUnreachable'

// Reaching the SSO takes a discovery request: a network blip, or a request the
// browser dropped, is no reason to leave the user on a blank page.
const authWithRetry = async (): ReturnType<typeof Auth> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await Auth()
    } catch (error) {
      if (attempt + 1 >= SSO_ATTEMPTS) throw error
      console.warn('Reaching the SSO failed, trying again:', error)
      await new Promise(resolve =>
        setTimeout(resolve, getRetryDelay(attempt, SSO_RETRY_BACKOFF))
      )
    }
  }
}

export const useInitializeApp = (): void => {
  const userData = useAppSelector(state => state.user)
  const dispatch = useAppDispatch()
  const hasInitiatedRef = useRef(false)

  useEffect(() => {
    if (hasInitiatedRef.current) return
    const isUserDataNotEmpty =
      userData.userData && Object.keys(userData.userData).length > 0
    if (isUserDataNotEmpty) {
      // The login callback already loaded everything. A later change of the
      // user data -- a timezone or a language picked in the settings -- is no
      // reason to load it all over again: that reload would race the write
      // the change triggered, and its stale answer would undo the pick.
      hasInitiatedRef.current = true
      return
    }
    if (window.location.pathname === '/callback') return
    hasInitiatedRef.current = true

    const initiateLogin = async (): Promise<void> => {
      // Former versions kept the tokens and the user info in sessionStorage
      sessionStorage.removeItem('tokenSet')
      sessionStorage.removeItem('userData')

      // The tokens live in memory only: they are there when the application
      // navigates without reloading, and a reload signs in through the SSO.
      if (getAccessToken() && userData.userData) {
        dispatch(setAppLoading(true))
        try {
          await dispatch(getOpenPaasUserData())
          await dispatch(getCalendarsList())
        } finally {
          dispatch(setAppLoading(false))
        }

        return
      }

      let loginurl: Awaited<ReturnType<typeof Auth>>
      try {
        loginurl = await authWithRetry()
      } catch (error) {
        console.error('The SSO cannot be reached:', error)
        dispatch(setUserError(SSO_UNREACHABLE_ERROR))
        dispatch(push('/error'))
        return
      }
      sessionStorage.setItem(
        'redirectState',
        JSON.stringify({
          code_verifier: loginurl.code_verifier,
          state: loginurl.state
        })
      )
      redirectTo(loginurl.redirectTo)
    }

    void initiateLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.userData])
}
