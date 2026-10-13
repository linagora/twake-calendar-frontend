import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData,
  setUserError
} from '@common/features/User/UserSlice'
import { isEmbedPath } from '@common/features/Embed/embeddedCalendar'
import { twakeSpace } from '@common/features/Embed/twakeSpace'
import { completeLogin, LoginRequiredError } from '@linagora/twake-oidc'
import { Stack, Typography } from '@linagora/twake-mui'
import { useEffect, useRef, useState } from 'react'
import { replace } from 'redux-first-history'
import { useI18n } from 'twake-i18n'

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'OAuth callback failed'
}

// A framed page cannot show the SSO portal: the user signs in again outside
const SignInRefused: React.FC = () => {
  const { t } = useI18n()
  return (
    <Stack
      sx={{ alignItems: 'center', justifyContent: 'center', height: '100vh' }}
    >
      <Typography>{t('embed.signInRequired')}</Typography>
    </Stack>
  )
}

export const CallbackResume: React.FC = () => {
  const dispatch = useAppDispatch()
  const hasRun = useRef(false)
  const hasNavigated = useRef(false)
  const returnTo = useRef('/calendar')
  const [isSignInRefused, setIsSignInRefused] = useState(false)
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

        // An embed route signs in on its own: back to it, not to the calendar
        if (isEmbedPath(data.returnTo)) returnTo.current = data.returnTo

        dispatch(setUserData(data.userinfo))
        dispatch(setTokens(data.tokenSet))

        await dispatch(getOpenPaasUserData())
        await dispatch(getCalendarsList())
      } catch (e) {
        if (e instanceof LoginRequiredError) {
          dispatch(setAppLoading(false))
          setIsSignInRefused(true)
          twakeSpace?.notifyLoginRequired()
          return
        }
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

    dispatch(replace(returnTo.current))
  }, [
    userData.loading,
    userData.userData,
    userData.tokens,
    userData.error,
    calendars.pending,
    dispatch
  ])

  return isSignInRefused ? <SignInRefused /> : null
}
