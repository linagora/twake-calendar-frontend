import { useAppSelector } from '@common/app/hooks'
import { exchangeToken } from '@common/features/Tdrive/TdriveDao'
import { getCozyURL } from '@common/utils/cozyUrl'
import Intents from 'cozy-interapp'
import { useEffect, useRef, useState } from 'react'
import { CozyStackError, fetchCozyIntentJSON } from '../IntentsDao'
import type { IntentServiceState } from '../types'

const getServiceFailureReason = (
  error: unknown
): 'forbidden' | 'serviceFailed' =>
  error instanceof CozyStackError && error.status === 403
    ? 'forbidden'
    : 'serviceFailed'

async function startIntentService(
  intentId: string,
  cozyURL: string,
  idToken: string
): Promise<IntentServiceState> {
  let accessToken: string
  try {
    accessToken = (await exchangeToken(cozyURL, idToken)).access_token
  } catch (error) {
    console.error('Intent: Cozy token exchange failed', error)
    return { status: 'error', reason: 'tokenExchangeFailed' }
  }

  try {
    const intents = new Intents({
      fetch: fetchCozyIntentJSON({ cozyURL, accessToken })
    })
    // cozy-interapp's own parsing of the id breaks on a second query param
    const service = await intents.createService(intentId, window)
    const { action, type } = service.getIntent().attributes
    return { status: 'ready', service, action, type, data: service.getData() }
  } catch (error) {
    console.error('Intent: service creation failed', error)
    return { status: 'error', reason: getServiceFailureReason(error) }
  }
}

/**
 * Creates the cozy-interapp service of the intent this frame serves, once the
 * user is signed in.
 */
export function useIntentService(intentId: string | null): IntentServiceState {
  const idToken = useAppSelector(state => state.user.tokens?.id_token)
  const email = useAppSelector(state => state.user.userData?.email)
  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  const [state, setState] = useState<IntentServiceState>({ status: 'loading' })
  // A second service would handshake a second time with the calling app
  const startedForRef = useRef<string | null>(null)

  const cozyURL = getCozyURL(email, workplaceFqdn)

  useEffect(() => {
    if (!intentId || !idToken || !cozyURL) return
    if (startedForRef.current === intentId) return
    startedForRef.current = intentId

    const start = async (): Promise<void> => {
      setState(await startIntentService(intentId, cozyURL, idToken))
    }
    void start()
  }, [intentId, idToken, cozyURL])

  if (!intentId) return { status: 'error', reason: 'missingIntent' }
  return state
}
