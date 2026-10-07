import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import { twakeSpace } from '@common/features/Embed/twakeSpace'
import { Callback, isSilentLoginRefused } from '@common/features/User/oidcAuth'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData,
  setUserError
} from '@common/features/User/UserSlice'
import {
  TokenEndpointResponse,
  TokenEndpointResponseHelpers,
  UserInfoResponse
} from 'openid-client'
import { getAccessToken, setTokenSet } from '@common/utils/apiUtils'
import { Stack, Typography } from '@linagora/twake-mui'
import { useEffect, useRef, useState } from 'react'
import { replace } from 'redux-first-history'
import { useI18n } from 'twake-i18n'

interface RedirectState {
  code_verifier: string
  state: string
  // The embed route the sign in started from
  returnTo?: string
}

const getSavedRedirectState = (): RedirectState | null => {
  const item = sessionStorage.getItem('redirectState')
  if (!item) return null
  try {
    const parsed = JSON.parse(item) as RedirectState

    if (parsed.code_verifier && parsed.state) {
      return parsed
    }
  } catch {
    console.error('Invalid redirectState')
  }
  return null
}

const hasSavedToken = (): boolean => {
  return getAccessToken() !== undefined
}

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'OAuth callback failed'
}

const processCallbackData = async (
  codeVerifier: string,
  state: string
): Promise<{
  userinfo: UserInfoResponse
  tokenSet: TokenEndpointResponse & TokenEndpointResponseHelpers
}> => {
  const data = await Callback(codeVerifier, state)
  if (!data?.userinfo || !data?.tokenSet) {
    throw new Error('OAuth callback failed')
  }
  return data
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
      const saved = getSavedRedirectState()
      const savedToken = hasSavedToken()

      // If no redirectState but we have saved session, just go home
      // This can happen if user refreshes callback page or gets redirected here after already logged in
      if (!saved) {
        if (!savedToken) {
          console.warn('Missing redirectState')
        }
        sessionStorage.removeItem('redirectState')
        dispatch(replace('/'))
        return
      }

      if (saved.returnTo && isSilentLoginRefused(window.location.search)) {
        sessionStorage.removeItem('redirectState')
        twakeSpace?.notifyLoginRequired()
        setIsSignInRefused(true)
        return
      }
      if (saved.returnTo) returnTo.current = saved.returnTo

      try {
        dispatch(setAppLoading(true))

        const data = await processCallbackData(saved.code_verifier, saved.state)

        // IMPORTANT: Hand the tokens to the API client FIRST, before making any
        // API call
        setTokenSet(data.tokenSet)

        dispatch(setUserData(data.userinfo))
        dispatch(setTokens(data.tokenSet))

        await dispatch(getOpenPaasUserData())
        await dispatch(getCalendarsList())

        sessionStorage.removeItem('redirectState')
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
