import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData,
  setUserError
} from '@common/features/User/UserSlice'
import { completeLogin } from '@linagora/twake-oidc'
import { useEffect, useRef } from 'react'
import { replace } from 'redux-first-history'

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'OAuth callback failed'
}

export const CallbackResume: React.FC = () => {
  const dispatch = useAppDispatch()
  const hasRun = useRef(false)
  const hasNavigated = useRef(false)
  const userData = useAppSelector(state => state.user)
  const calendars = useAppSelector(state => state.calendars)

  // Process callback and load data
  useEffect(() => {
    if (hasRun.current) {
      return
    }
    hasRun.current = true

    const runCallback = async (): Promise<void> => {
      try {
        dispatch(setAppLoading(true))

        // Hands the tokens to the API client before resolving
        const data = await completeLogin()

        // No sign-in pending: the callback page was reloaded or opened directly
        if (!data) {
          dispatch(setAppLoading(false))
          dispatch(replace('/'))
          return
        }

        dispatch(setUserData(data.userinfo))
        dispatch(setTokens(data.tokenSet))

        await dispatch(getOpenPaasUserData())
        await dispatch(getCalendarsList())
      } catch (e) {
        console.error('OIDC callback error:', e)
        dispatch(setAppLoading(false))
        dispatch(setUserError(getErrorMessage(e)))
        dispatch(replace('/error'))
      }
    }

    void runCallback()
  }, [dispatch])

  // Navigate to /calendar only when all data is ready
  useEffect(() => {
    if (hasNavigated.current) return
    if (userData.loading || calendars.pending) return
    // Calendar loading failures are reported by a toast inside the calendar
    // view: only a broken user session justifies the full error page.
    if (userData.error) {
      dispatch(setAppLoading(false))
      dispatch(replace('/error'))
      return
    }
    if (!userData.userData || !userData.tokens) return
    // Calendars list can be empty, that's valid - just need to finish loading

    // All data is ready, navigate to calendar
    hasNavigated.current = true
    dispatch(setAppLoading(false))

    // Clear any query params from URL first, then navigate
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    dispatch(replace('/calendar'))
  }, [
    userData.loading,
    userData.userData,
    userData.tokens,
    userData.error,
    calendars.pending,
    dispatch
  ])

  return null
}
