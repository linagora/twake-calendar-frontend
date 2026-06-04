import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/react'
import './index.styl'
import App from './App'
import { store } from '@common/app/store'
import { initSentry, SentryErrorBoundary } from '@common/app/sentry'

initSentry()

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
