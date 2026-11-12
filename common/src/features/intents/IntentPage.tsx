import { useAppSelector } from '@common/app/hooks'
import { reportCrash } from '@common/app/sentry'
import { Loading } from '@common/components/Loading/Loading'
import { Stack, Typography } from '@linagora/twake-mui'
import { onSessionEndedElsewhere } from '@linagora/twake-oidc'
import type { IntentServiceAPI } from 'cozy-interapp'
import type { JSX } from 'react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useI18n } from 'twake-i18n'
import { hasLoadFailed } from './calendarsState'
import { hasLoginRequired, subscribeLoginRequired } from './loginRequired'
import { isNewEventIntent, parseNewEventData } from './newEventIntent'
import { NewEventIntentPage } from './NewEventIntentPage'
import {
  failIntent,
  useIntentService,
  type IntentServiceError
} from './useIntentService'

/** What the page says when it cannot serve the intent */
export type IntentMessage =
  IntentServiceError | 'sessionExpired' | 'unsupported' | 'invalidData'

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

interface RejectedIntentProps {
  service: IntentServiceAPI
  message: IntentMessage
  /** What the client gets */
  error: string
}

/**
 * Tells the client the intent fails, and the user why. In an Effect, as it
 * talks to the page around; the ref keeps it to once.
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
    failIntent(service, new Error(error))
  }, [service, error])

  return <IntentMessageScreen message={message} />
}

/**
 * Whether the session ended: another tab of the calendar ended it, or the
 * calendar server answered 401 (twake-oidc's onLoginRequired, read with
 * useSyncExternalStore from loginRequired.ts). The frame never shows the SSO,
 * nor the calendar: the page says it and the client is told (it can open
 * Calendar in a tab instead), once no save is in flight (IntentPage).
 */
function useSessionEnded(): boolean {
  const [hasEndedElsewhere, setHasEndedElsewhere] = useState(false)
  useEffect(() => onSessionEndedElsewhere(() => setHasEndedElsewhere(true)), [])
  const isLoginRequired = useSyncExternalStore(
    subscribeLoginRequired,
    hasLoginRequired
  )
  return hasEndedElsewhere || isLoginRequired
}

/** What the page knows besides the intent */
interface PageState {
  /** And no save is in flight, whose outcome decides */
  hasSessionEnded: boolean
  /** The user or their calendars could not be loaded (calendarsState.ts) */
  hasLoadFailed: boolean
}

// Why the intent the client sent cannot be served, null when it can
function rejectionOf(
  service: IntentServiceAPI,
  { hasSessionEnded, hasLoadFailed }: PageState
): Omit<RejectedIntentProps, 'service'> | null {
  const { action, type } = service.getIntent().attributes
  if (hasSessionEnded) {
    return { message: 'sessionExpired', error: 'The session has ended' }
  }
  if (!isNewEventIntent(action, type)) {
    return {
      message: 'unsupported',
      error: `Twake Calendar does not handle ${action} ${type}`
    }
  }
  if (hasLoadFailed) {
    return {
      message: 'failed',
      error: 'Twake Calendar could not load the calendars of the user'
    }
  }
  return null
}

/**
 * The `/intents?intent=<id>` page, signed in: the service of an intent
 * another app (Twake Chat) started with cozy-interapp. Twake Calendar serves
 * one: `CREATE io.cozy.calendar.events`, a new event (newEventIntent.ts).
 * A crash of the form is reported to Sentry (reportCrash) and fails the
 * intent, once the outcome of a save in flight is known: saved, the client
 * got the event. Used by IntentsApp.
 */
export function IntentPage({ intentId }: { intentId: string }): JSX.Element {
  const state = useIntentService(intentId)
  const hasSessionEnded = useSessionEnded()
  const isLoadFailed = useAppSelector(hasLoadFailed)
  // A save sent to the server and not failed: the event may be created, so
  // its outcome, not the end of the session nor a crash of the form, decides
  // what the client gets. Told by the form's submit (useSubmitOnce)
  const [isSaving, setIsSaving] = useState(false)

  if (state.status === 'loading') return <Loading />
  if (state.status === 'failed') {
    return <IntentMessageScreen message={state.error} />
  }

  const { service } = state
  const rejection = rejectionOf(service, {
    hasSessionEnded: hasSessionEnded && !isSaving,
    hasLoadFailed: isLoadFailed
  })
  if (rejection !== null)
    return <RejectedIntent service={service} {...rejection} />
  // Read once, when the client answered (useIntentService): later data of
  // the client never replaces the form
  const data = parseNewEventData(state.data)
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
      fallback={
        isSaving ? (
          <Loading />
        ) : (
          // Nothing of the error leaves the app
          <RejectedIntent
            service={service}
            message="failed"
            error="The new event form of Twake Calendar failed"
          />
        )
      }
      onError={reportCrash}
    >
      <NewEventIntentPage
        service={service}
        initialAttendees={data.attendees}
        hasSessionEnded={hasSessionEnded}
        isSaving={isSaving}
        onSavingChange={setIsSaving}
      />
    </ErrorBoundary>
  )
}
