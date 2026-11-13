import * as Sentry from '@sentry/react'
import type { ErrorInfo } from 'react'
import { scrubDeep } from '@common/utils/scrubSensitiveData'

/**
 * Initializes Sentry if window.SENTRY_DSN is configured.
 *
 * Every event and breadcrumb is scrubbed before it leaves the browser: URLs
 * lose their query string, and the credentials (participation JWT, booking
 * token, OIDC code and state, WebSocket ticket) and email addresses found in
 * messages are masked.
 */
export function initSentry(): void {
  if (window.SENTRY_DSN) {
    Sentry.init({
      dsn: window.SENTRY_DSN,
      sendDefaultPii: false,
      integrations: [
        Sentry.captureConsoleIntegration({ levels: ['warn', 'error'] })
      ],
      beforeSend: event => scrubDeep(event),
      beforeBreadcrumb: breadcrumb => scrubDeep(breadcrumb)
    })
  }
}

/**
 * Reports a crash an ErrorBoundary caught to Sentry, with the component
 * stack: the root Sentry.ErrorBoundary never sees an error caught lower.
 * Used by App and IntentPage.
 */
export function reportCrash(error: unknown, errorInfo: ErrorInfo): void {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack
      }
    }
  })
}
