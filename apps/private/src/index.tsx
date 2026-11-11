import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/react'
import './index.styl'
import App from './App'
import { IntentsApp } from './IntentsApp'
import { store } from '@common/app/store'
import { initSentry } from '@common/app/sentry'
import { configureAuth } from '@linagora/twake-oidc'
import { isEmbedPath } from '@common/features/Embed/embeddedCalendar'
import {
  intentsRedirectUri,
  isUnderIntentsPath
} from '@common/features/intents/intentPath'
import { twakeSpace } from '@common/features/Embed/twakeSpace'

// Another app of the Workplace (Twake Chat) frames /intents for a cozy-stack
// intent: every path under it is the intents page, never the calendar
const isIntentsPage = isUnderIntentsPath(window.location.pathname)
const ssoRedirectUri = window.SSO_REDIRECT_URI ?? ''

initSentry()
configureAuth({
  ssoUrl: window.SSO_BASE_URL ?? '',
  clientId: window.SSO_CLIENT_ID ?? '',
  scope: window.SSO_SCOPE ?? '',
  // The intents page has its own callback, which any page may frame, unlike
  // the callback of the calendar
  redirectUri: isIntentsPage
    ? intentsRedirectUri(ssoRedirectUri)
    : ssoRedirectUri,
  postLogoutRedirectUri: window.SSO_POST_LOGOUT_REDIRECT ?? '',
  apiUrl: window.CALENDAR_BASE_URL,
  // TwakeSpace frames the embed routes, another app the intents page: their
  // sign in shows no SSO page and leaves no history entry
  framed: () => isIntentsPage || isEmbedPath(window.location.pathname),
  // Framed, an ended session never navigates the frame: TwakeSpace signs
  // the user in again at the top level and reloads its frames
  onLoginRequired: () => {
    twakeSpace?.notifyLoginRequired()
  }
})

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

const root = createRoot(container)
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary>
      <Provider store={store}>
        {isIntentsPage ? <IntentsApp /> : <App />}
      </Provider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
