import { Loading } from '@common/components/Loading/Loading'
import { Stack, Typography } from '@linagora/twake-mui'
import { onSessionEndedElsewhere } from '@linagora/twake-oidc'
import type { IntentService } from 'cozy-interapp'
import { useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useI18n } from 'twake-i18n'
import { checkFrameAncestors, readAncestorOrigins } from './frameAncestors'
import { isNewEventIntent, parseNewEventData } from './newEventIntent'
import { NewEventIntentPage } from './NewEventIntentPage'
import { useIntentService, type IntentServiceError } from './useIntentService'

/** What the page says when it cannot serve the intent */
export type IntentMessage =
  | IntentServiceError
  | 'sessionExpired'
  | 'unsupported'
  | 'invalidData'
  | 'untrustedFrame'

/**
 * Why the intent cannot be served, as the whole page of the frame: the app
 * that framed it keeps its own close button. Used by IntentsApp and
 * IntentPage.
 */
export function IntentMessageScreen({
  message
}: {
  message: IntentMessage
}): JSX.Element {
  const { t } = useI18n()
  return (
    <Stack
      component="main"
      spacing={1}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        textAlign: 'center'
      }}
    >
      <Typography variant="h5" component="h1">
        {t(`intents.${message}.title`)}
      </Typography>
      <Typography>{t(`intents.${message}.description`)}</Typography>
    </Stack>
  )
}

/** The client gets the error; called again, it is ignored */
function failIntent(service: IntentService, error: Error): void {
  try {
    service.throw(error)
  } catch {
    // Already answered
  }
}

/** Cancels the intent; called again, it is ignored */
function cancelIntent(service: IntentService): void {
  try {
    service.cancel()
  } catch {
    // Already answered
  }
}

interface RejectedIntentProps {
  service: IntentService
  message: Exclude<IntentMessage, IntentServiceError>
  /** What the client gets; null: the intent is cancelled */
  error: string | null
}

/**
 * Tells the client the intent fails or is cancelled, and the user why. In an
 * Effect, as it talks to the page around; the ref keeps it to once.
 */
function RejectedIntent({
  service,
  message,
  error
}: RejectedIntentProps): JSX.Element {
  const answeredRef = useRef(false)

  useEffect(() => {
    if (answeredRef.current) return
    answeredRef.current = true
    if (error === null) cancelIntent(service)
    else failIntent(service, new Error(error))
  }, [service, error])

  return <IntentMessageScreen message={message} />
}

/**
 * Whether another tab of the calendar ended the session. The frame never
 * shows the SSO, nor the calendar: the page says it and the client is told
 * (it can open Calendar in a tab instead).
 */
function useSessionEndedElsewhere(): boolean {
  const [hasEnded, setHasEnded] = useState(false)
  useEffect(() => onSessionEndedElsewhere(() => setHasEnded(true)), [])
  return hasEnded
}

// Why the intent the client sent cannot be served, null when it can
function rejectionOf(
  service: IntentService,
  hasSessionEnded: boolean
): Omit<RejectedIntentProps, 'service'> | null {
  const { action, type, frameAncestors } = service.getIntent().attributes
  if (hasSessionEnded) {
    return { message: 'sessionExpired', error: 'The session has ended' }
  }
  // The client answered the handshake: is the page framed by it only?
  if (
    checkFrameAncestors(frameAncestors, readAncestorOrigins()) === 'untrusted'
  ) {
    return { message: 'untrustedFrame', error: null }
  }
  if (!isNewEventIntent(action, type)) {
    return {
      message: 'unsupported',
      error: `Twake Calendar does not handle ${action} ${type}`
    }
  }
  return null
}

/**
 * The `/intents?intent=<id>` page, signed in: the service of an intent
 * another app (Twake Chat) started with cozy-interapp. Twake Calendar serves
 * one: `CREATE io.cozy.calendar.events`, a new event (newEventIntent.ts).
 * Used by IntentsApp.
 */
export function IntentPage({ intentId }: { intentId: string }): JSX.Element {
  const state = useIntentService(intentId)
  const hasSessionEnded = useSessionEndedElsewhere()

  if (state.status === 'loading') return <Loading />
  if (state.status === 'failed') {
    return <IntentMessageScreen message={state.error} />
  }

  const { service } = state
  const rejection = rejectionOf(service, hasSessionEnded)
  if (rejection !== null)
    return <RejectedIntent service={service} {...rejection} />
  const data = parseNewEventData(service.getData())
  if (data === null) {
    return (
      <RejectedIntent
        service={service}
        message="invalidData"
        error="The data of the new event has another shape"
      />
    )
  }
  return (
    <ErrorBoundary
      fallback={<IntentMessageScreen message="failed" />}
      onError={error => {
        console.error('[intents] The new event form failed', error)
        // Nothing of the error leaves the app
        failIntent(
          service,
          new Error('The new event form of Twake Calendar failed')
        )
      }}
    >
      <NewEventIntentPage service={service} initialAttendees={data.attendees} />
    </ErrorBoundary>
  )
}
