import { failIntent } from '@common/features/Intents/intentLifecycle'
import type { IntentService } from 'cozy-interapp'
import type { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { IntentMessage } from './IntentMessage'
import './Intents.styl'

interface IntentLayoutProps {
  service: IntentService
  children: ReactNode
}

const IntentCrashFallback = (): JSX.Element => (
  <IntentMessage reason="crashed" />
)

/** Bare frame of an intent: no menubar nor sidebar, a crash fails the intent. */
export function IntentLayout({
  service,
  children
}: IntentLayoutProps): JSX.Element {
  const handleError = (error: unknown): void => {
    failIntent(
      service,
      error instanceof Error ? error : new Error(String(error))
    )
  }

  return (
    <div className="intent-layout" data-testid="intent-layout">
      <ErrorBoundary
        FallbackComponent={IntentCrashFallback}
        onError={handleError}
      >
        {children}
      </ErrorBoundary>
    </div>
  )
}
