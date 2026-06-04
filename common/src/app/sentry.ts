import * as Sentry from '@sentry/react'

/**
 * Initializes Sentry if window.SENTRY_DSN is configured.
 */
export function initSentry(): void {
  if (window.SENTRY_DSN) {
    Sentry.init({
      dsn: window.SENTRY_DSN,
      integrations: [
        Sentry.captureConsoleIntegration({ levels: ['warn', 'error'] })
      ]
    })
  }
}
