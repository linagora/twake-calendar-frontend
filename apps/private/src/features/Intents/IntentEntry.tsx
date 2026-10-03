import { Loading } from '@common/components/Loading/Loading'
import { useIntentService } from '@common/features/Intents/hooks/useIntentService'
import { failIntent } from '@common/features/Intents/intentLifecycle'
import type { IntentService } from 'cozy-interapp'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { IntentLayout } from './IntentLayout'
import { IntentMessage } from './IntentMessage'
import { findIntentHandler } from './intentRegistry'

interface UnsupportedIntentProps {
  service: IntentService
  action: string
  type: string
}

function UnsupportedIntent({
  service,
  action,
  type
}: UnsupportedIntentProps): JSX.Element {
  useEffect(() => {
    failIntent(
      service,
      new Error(`Twake Calendar does not handle ${action} ${type}`)
    )
  }, [service, action, type])

  return <IntentMessage reason="unsupported" />
}

/**
 * Serves the intents of the other apps of the workplace: the Cozy stack points
 * their service here, in an iframe of the app that started the intent.
 */
export default function IntentEntry(): JSX.Element {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const authError = params.get('authError')
  const state = useIntentService(authError ? null : params.get('intent'))

  if (authError) return <IntentMessage reason="sessionExpired" />
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <IntentMessage reason={state.reason} />

  const handler = findIntentHandler(state.action, state.type)
  if (!handler) {
    return (
      <UnsupportedIntent
        service={state.service}
        action={state.action}
        type={state.type}
      />
    )
  }

  const Handler = handler.component
  return (
    <IntentLayout service={state.service}>
      <Handler service={state.service} data={state.data} />
    </IntentLayout>
  )
}
