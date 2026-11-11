import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import {
  completeLogin,
  getPendingReturnTo,
  LoginRequiredError,
  startLogin
} from '@linagora/twake-oidc'
import { useEffect, useRef, useState } from 'react'
import { HistoryRouter as Router } from 'redux-first-history/rr6'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { history, type AppDispatch } from '@common/app/store'
import { Loading } from '@common/components/Loading/Loading'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import {
  IntentMessageScreen,
  IntentPage
} from '@common/features/intents/IntentPage'
import {
  isIntentsCallbackPath,
  parseIntentPath
} from '@common/features/intents/intentPath'
import { ColorSchemeSync } from '@common/features/Settings/ColorSchemeSync'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData
} from '@common/features/User/UserSlice'
import { makeCalendarOverrides } from '@common/theme/makeCalendarOverrides'
import paletteData from '@common/theme/palette.json'
import { AppI18n } from './AppI18n'

const themeOptions = makeCalendarOverrides(true)

/** The page under /intents the browser loaded */
interface IntentsPage {
  /** Null on a path under `/intents` that serves no intent */
  intentId: string | null
  /** The SSO came back to `/intents/callback` for a login of an intent */
  isCallback: boolean
}

// On the callback, the intent is the one the pending login started from:
// none pending (a login of the calendar, a reload), no intent, no code to
// exchange
function readIntentsPage(): IntentsPage {
  const { pathname, search } = window.location
  if (!isIntentsCallbackPath(pathname)) {
    return { intentId: parseIntentPath(pathname + search), isCallback: false }
  }
  const returnTo = getPendingReturnTo()
  return {
    intentId: returnTo === null ? null : parseIntentPath(returnTo),
    isCallback: true
  }
}

type Phase = 'callback' | 'ready' | 'login-required' | 'failed'

/** Puts the intent in the address, without a history entry */
function leaveCallback(intentId: string): void {
  window.history.replaceState(null, '', `/intents?intent=${intentId}`)
}

// The code exchanged, the user and their calendars loaded, as the callback
// of the calendar does (CallbackResume): the form opens with them
async function completeIntentLogin(dispatch: AppDispatch): Promise<Phase> {
  try {
    const data = await completeLogin()
    if (data === null) return 'ready'
    dispatch(setUserData(data.userinfo))
    dispatch(setTokens(data.tokenSet))
    await dispatch(getOpenPaasUserData())
    await dispatch(getCalendarsList())
    return 'ready'
  } catch (error: unknown) {
    if (error instanceof LoginRequiredError) return 'login-required'
    console.error('[intents] Login callback failed', error)
    return 'failed'
  }
}

/**
 * On the callback, exchanges the code once (an Effect, as it talks to the
 * SSO; the ref keeps it to once, StrictMode runs Effects twice), then puts
 * the intent back in the address and moves to the next phase.
 */
function useCallbackExchange(
  phase: Phase,
  intentId: string,
  setPhase: (phase: Phase) => void
): void {
  const dispatch = useAppDispatch()
  const hasRunRef = useRef(false)
  useEffect(() => {
    if (phase !== 'callback' || hasRunRef.current) return
    hasRunRef.current = true
    const exchange = async (): Promise<void> => {
      const next = await completeIntentLogin(dispatch)
      leaveCallback(intentId)
      setPhase(next)
    }
    void exchange()
  }, [phase, intentId, dispatch, setPhase])
}

/**
 * Not signed in: goes to the SSO once, silently (the `framed` option of
 * twake-oidc, index.tsx), which comes back to /intents/callback.
 */
function useSilentLogin(
  phase: Phase,
  isSignedIn: boolean,
  setPhase: (phase: Phase) => void
): void {
  const hasRunRef = useRef(false)
  useEffect(() => {
    if (phase !== 'ready' || isSignedIn || hasRunRef.current) return
    hasRunRef.current = true
    const signIn = async (): Promise<void> => {
      try {
        await startLogin()
      } catch (error: unknown) {
        console.error('[intents] The SSO cannot be reached', error)
        setPhase('failed')
      }
    }
    void signIn()
  }, [phase, isSignedIn, setPhase])
}

/**
 * The silent sign-in of the frame (`prompt=none`: a frame never shows the
 * login form of the SSO), then the intent. A session the SSO cannot renew
 * without the user says so in the frame.
 */
function IntentsLogin({
  intentId,
  isCallback
}: {
  intentId: string
  isCallback: boolean
}): JSX.Element {
  const isSignedIn = useAppSelector(state => Boolean(state.user.tokens))
  const [phase, setPhase] = useState<Phase>(isCallback ? 'callback' : 'ready')
  useCallbackExchange(phase, intentId, setPhase)
  useSilentLogin(phase, isSignedIn, setPhase)

  if (phase === 'login-required') {
    return <IntentMessageScreen message="sessionExpired" />
  }
  if (phase === 'failed') return <IntentMessageScreen message="failed" />
  if (phase === 'callback' || !isSignedIn) return <Loading />
  // The form reads the location (its guard of unsaved changes)
  return (
    <Router history={history}>
      <IntentPage intentId={intentId} />
    </Router>
  )
}

/**
 * The `/intents` page, framed by the app that started a cozy-stack intent
 * (Twake Chat): the calendar's theme and texts, no Twake bar, never the
 * calendar. Every path under `/intents` shows the intent or why it cannot be
 * served. Rendered instead of App by index.tsx, inside the store Provider.
 */
export function IntentsApp(): JSX.Element {
  const [page] = useState(readIntentsPage)
  return (
    <TwakeMuiThemeProvider palette={paletteData} themeOptions={themeOptions}>
      <ColorSchemeSync />
      <AppI18n>
        {page.intentId === null ? (
          <IntentMessageScreen message="unavailable" />
        ) : (
          <IntentsLogin intentId={page.intentId} isCallback={page.isCallback} />
        )}
      </AppI18n>
    </TwakeMuiThemeProvider>
  )
}
