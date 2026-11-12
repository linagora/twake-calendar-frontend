import type { JSX } from 'react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { Suspense, useEffect, useMemo } from 'react'
import { Route, Routes } from 'react-router'
import { HistoryRouter as Router } from 'redux-first-history/rr6'
import { push } from 'redux-first-history'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { history, store } from '@common/app/store'
import { reportCrash } from '@common/app/sentry'
import { Error as ErrorPage } from '@common/components/Error/Error'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { UndoableActionsProvider } from '@common/components/UndoableActions/UndoableActionsProvider'
import { DebugModeToggle } from '@common/components/Debug/DebugModeToggle'
import { TwakeBarHeader } from '@common/components/TwakeBarHeader/TwakeBarHeader'
import { ErrorBoundary } from 'react-error-boundary'
import { Loading } from '@common/components/Loading/Loading'
import { default as CalendarLayout } from '@/components/Calendar/CalendarLayout'
import { EmbeddedCalendar } from '@/components/Calendar/EmbeddedCalendar'
import {
  EMBED_CALENDAR_ROUTE,
  EMBED_EVENT_ROUTE
} from '@common/features/Embed/embeddedCalendar'
import {
  overlayThemeOptions,
  SpaceOverlayProvider
} from '@common/features/Embed/spaceOverlay'
import {
  reportUpcomingEventsToTwakeSpace,
  spaceOverlay,
  syncHistoryWithTwakeSpace,
  twakeSpace
} from '@common/features/Embed/twakeSpace'
import { default as HandleLogin } from '@/features/User/HandleLogin'
import { default as EventDeepLink } from '@common/features/Events/EventDeepLink'
import { default as NewEventDeepLink } from '@common/features/Events/NewEventDeepLink'
import { CallbackResume } from '@/features/User/LoginCallback'
import { useInitializeApp } from '@common/features/User/useInitializeApp'
import { usePlatformSignIn } from '@common/hooks/usePlatformSignIn'
import { redirectTo } from '@common/utils/navigation'
import { onSessionEndedElsewhere } from '@linagora/twake-oidc'
import { WebSocketGate } from '@common/websocket/WebSocketGate'
import {
  calendarColorSchemes,
  makeCalendarOverrides
} from '@common/theme/makeCalendarOverrides'
import { ColorSchemeSync } from '@common/features/Settings/ColorSchemeSync'
import paletteData from '@common/theme/palette.json'
import { AppI18n } from './AppI18n'

export default function App(): JSX.Element {
  const error = useAppSelector(state => state.user.error)
  const appLoading = useAppSelector(state => state.loading.isLoading)
  usePlatformSignIn()

  const dispatch = useAppDispatch()
  useEffect(() => {
    if (error) {
      dispatch(push('/error'))
    }
  }, [error, dispatch])

  useInitializeApp()

  // Logging out from another tab ended the session: start over from the login
  useEffect(() => onSessionEndedElsewhere(() => redirectTo('/')), [])

  // Framed by TwakeSpace, the default theme of Twake: the dialogs and drawers
  // go onto its overlay, with the palette additions of the calendar
  const themeOptions = useMemo(
    () =>
      spaceOverlay === null
        ? makeCalendarOverrides(true)
        : {
            ...overlayThemeOptions(spaceOverlay),
            colorSchemes: calendarColorSchemes
          },
    []
  )

  // Framed by TwakeSpace: it owns the browser history, the router follows it
  useEffect(
    () =>
      twakeSpace ? syncHistoryWithTwakeSpace(twakeSpace, history) : undefined,
    []
  )
  // Framed by TwakeSpace: the home of the space shows the upcoming events
  useEffect(
    () =>
      twakeSpace
        ? reportUpcomingEventsToTwakeSpace(twakeSpace, store)
        : undefined,
    []
  )

  return (
    <TwakeMuiThemeProvider
      palette={spaceOverlay === null ? paletteData : undefined}
      themeOptions={themeOptions}
    >
      <ColorSchemeSync />
      <AppI18n>
        {/* A crash of the bar leaves calendar without it, not without calendar */}
        <ErrorBoundary fallback={null} onError={reportCrash}>
          <TwakeBarHeader />
        </ErrorBoundary>
        <ErrorBoundary
          FallbackComponent={({ error }) => (
            <ErrorPage isCrashFallback errorBoundaryMessage={error as Error} />
          )}
          onError={reportCrash}
        >
          <Suspense fallback={<Loading />}>
            <WebSocketGate />
            <SpaceOverlayProvider overlay={spaceOverlay}>
              <UndoableActionsProvider>
                <Router history={history}>
                  <Routes>
                    <Route path="/" element={<HandleLogin />} />
                    <Route path="/calendar" element={<CalendarLayout />} />
                    <Route
                      path={EMBED_CALENDAR_ROUTE}
                      element={<EmbeddedCalendar />}
                    />
                    <Route
                      path={EMBED_EVENT_ROUTE}
                      element={<EmbeddedCalendar />}
                    />
                    <Route path="/events/:uid" element={<EventDeepLink />} />
                    <Route path="/newEvent" element={<NewEventDeepLink />} />
                    <Route path="/callback" element={<CallbackResume />} />
                    <Route path="/error" element={<ErrorPage />} />
                  </Routes>
                </Router>
              </UndoableActionsProvider>
            </SpaceOverlayProvider>
            <ErrorSnackbar error={error} type="user" />
            <DebugModeToggle />
          </Suspense>
          {appLoading && <Loading />}
        </ErrorBoundary>
      </AppI18n>
    </TwakeMuiThemeProvider>
  )
}
