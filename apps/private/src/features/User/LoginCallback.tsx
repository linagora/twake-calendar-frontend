import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import {
  buildIntentPath,
  takePendingIntent
} from '@common/features/Intents/pendingIntent'
import { Callback } from '@common/features/User/oidcAuth'
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
import { useEffect, useRef } from 'react'
import { replace } from 'redux-first-history'

interface RedirectState {
  code_verifier: string
  state: string
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

export const CallbackResume: React.FC = () => {
  const dispatch = useAppDispatch()
  const hasRun = useRef(false)
  const hasNavigated = useRef(false)
  const pendingIntentRef = useRef<string | null>(null)
  const userData = useAppSelector(state => state.user)
  const calendars = useAppSelector(state => state.calendars)

  // Process callback and load data
  useEffect(() => {
    if (hasRun.current) {
      return
    }
    hasRun.current = true

    const runCallback = async (): Promise<void> => {
      pendingIntentRef.current = takePendingIntent()
      const authError = new URLSearchParams(window.location.search).get('error')
      if (pendingIntentRef.current && authError) {
        // The SSO answered the intent frame's prompt=none without signing in:
        // the frame explains it, the error page would be a dead end there.
        sessionStorage.removeItem('redirectState')
        dispatch(replace(buildIntentPath(pendingIntentRef.current, authError)))
        return
      }
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

    dispatch(
      replace(
        pendingIntentRef.current
          ? buildIntentPath(pendingIntentRef.current)
          : '/calendar'
      )
    )
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
