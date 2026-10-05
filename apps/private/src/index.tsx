import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/react'
import './index.styl'
import App from './App'
import { store } from '@common/app/store'
import { initSentry } from '@common/app/sentry'
import { configureAuth } from '@linagora/twake-oidc'

initSentry()
configureAuth({
  ssoUrl: window.SSO_BASE_URL ?? '',
  clientId: window.SSO_CLIENT_ID ?? '',
  scope: window.SSO_SCOPE ?? '',
  redirectUri: window.SSO_REDIRECT_URI ?? '',
  postLogoutRedirectUri: window.SSO_POST_LOGOUT_REDIRECT ?? '',
  apiUrl: window.CALENDAR_BASE_URL
})

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

const root = createRoot(container)
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary>
      <Provider store={store}>
        <App />
      </Provider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
