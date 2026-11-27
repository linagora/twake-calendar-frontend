import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/react'
import '../index.styl'
import { IntentsApp } from '../IntentsApp'
import { store } from '@common/app/store'
import { initSentry } from '@common/app/sentry'
import { configureAuth } from '@linagora/twake-oidc'
import { intentsRedirectUri } from '@common/features/intents/intentPath'
import { reportLoginRequired } from '@common/features/intents/loginRequired'

// The entry of the intents page, its own entry of the bundler: nginx serves
// it for /intents and every path under it, so the intents page never loads
// the calendar and the calendar (../index.tsx) never loads the intents page.
// Another app of the Workplace (Twake Chat) frames it for a cozy-stack intent.

// Null without a usable redirect URI: the intents page then says it failed
const intentsRedirect = intentsRedirectUri(window.SSO_REDIRECT_URI ?? '')

initSentry()
configureAuth({
  ssoUrl: window.SSO_BASE_URL ?? '',
  clientId: window.SSO_CLIENT_ID ?? '',
  scope: window.SSO_SCOPE ?? '',
  // The intents page has its own callback, which any page may frame, unlike
  // the callback of the calendar
  redirectUri: intentsRedirect ?? '',
  postLogoutRedirectUri: window.SSO_POST_LOGOUT_REDIRECT ?? '',
  apiUrl: window.CALENDAR_BASE_URL,
  // Framed by another app: its sign in shows no SSO page and leaves no
  // history entry
  framed: () => true,
  // Framed, an ended session never navigates the frame: the page tells its
  // client
  onLoginRequired: reportLoginRequired
})

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

createRoot(container).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary>
      <Provider store={store}>
        <IntentsApp canSignIn={intentsRedirect !== null} />
      </Provider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
