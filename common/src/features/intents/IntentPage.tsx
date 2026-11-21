import { useAppSelector } from '@common/app/hooks'
import { reportCrash } from '@common/app/sentry'
import { Loading } from '@common/components/Loading/Loading'
import { onSessionEndedElsewhere } from '@linagora/twake-oidc'
import type { IntentServiceAPI } from 'cozy-interapp'
import type { JSX } from 'react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { hasLoadFailed } from './calendarsState'
import {
  IntentMessageScreen,
  RejectedIntent,
  type RejectedIntentProps
} from './IntentFrame'
import { hasLoginRequired, subscribeLoginRequired } from './loginRequired'
import { isNewEventIntent, parseNewEventData } from './newEventIntent'
import { NewEventIntentPage } from './NewEventIntentPage'
import { isOpenEventIntent, parseOpenEventData } from './openEventIntent'
import { OpenEventIntentPage } from './OpenEventIntentPage'
import { useIntentService } from './useIntentService'

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
  if (!isNewEventIntent(action, type) && !isOpenEventIntent(action, type)) {
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
 * The preview of an event (`OPEN io.cozy.calendar.events`,
 * openEventIntent.ts), its data read once, when the client answered. A crash
 * of the preview is reported to Sentry and fails the intent.
 */
function OpenEventIntent({
  service,
  data
}: {
  service: IntentServiceAPI
  data: unknown
}): JSX.Element {
  const parsed = parseOpenEventData(data)
  if (parsed === null) {
    return (
      <RejectedIntent
        service={service}
        message="invalidData"
        error="The data of the event to open has another shape"
      />
    )
  }
  return (
    <ErrorBoundary
      fallback={
        <RejectedIntent
          service={service}
          message="failed"
          error="The event preview of Twake Calendar failed"
        />
      }
      onError={reportCrash}
    >
      <OpenEventIntentPage
        service={service}
        uid={parsed.uid}
        askedReply={parsed.reply}
        expected={parsed.expected}
      />
    </ErrorBoundary>
  )
}

/**
 * The `/intents?intent=<id>` page, signed in: the service of an intent
 * another app (Twake Chat) started with cozy-interapp, by its action.
 * Twake Calendar serves two: `CREATE io.cozy.calendar.events`, a new event
 * (newEventIntent.ts), and `OPEN io.cozy.calendar.events`, the preview of an
 * event (OpenEventIntent). A crash of the form is reported to Sentry (reportCrash) and fails the
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
  const { action, type } = service.getIntent().attributes
  if (isOpenEventIntent(action, type)) {
    return <OpenEventIntent service={service} data={state.data} />
  }
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
