import { useAppSelector } from '@common/app/hooks'
import { selectPlatformURL } from '@common/app/selectors/selectPlatformURL'
import { makeIntentFetch } from '@common/features/Tdrive/hooks/useTdrivePicker'
import { ensureSdkSignedIn } from '@common/utils/sdkSession'
import { SdkError, type Sdk } from '@linagora/twake-sdk'
import Intents, { type IntentService } from 'cozy-interapp'
import { useEffect, useRef, useState } from 'react'

/**
 * Why the page cannot serve the intent, before the service exists (nothing
 * can be told to the client then: the page says it):
 * - `unavailable`: not in a frame, no platform for the user, or the stack
 *   refused the token
 * - `forbidden`: the stack does not let Calendar read the intent (its
 *   manifest or the token exchange are not set up)
 * - `failed`: the stack or the client did not answer
 */
export type IntentServiceError = 'unavailable' | 'forbidden' | 'failed'

/**
 * How long the client has to answer the `ready` message: an origin that is
 * not the one the stack knows for it never gets it
 */
export const CLIENT_ANSWER_TIMEOUT_MS = 30_000

export type IntentServiceState =
  | { status: 'loading' }
  | { status: 'ready'; service: IntentService }
  | { status: 'failed'; error: IntentServiceError }

const failed = (error: IntentServiceError): IntentServiceState => ({
  status: 'failed',
  error
})

/** The value, or null once the delay is over */
async function withTimeout<T>(
  promise: Promise<T>,
  delayMs: number
): Promise<T | null> {
  let timer = 0
  const timeout = new Promise<null>(resolve => {
    timer = window.setTimeout(() => resolve(null), delayMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    window.clearTimeout(timer)
  }
}

/** Reads the intent with the token of the stack, then waits for the client */
async function startService(
  intentId: string,
  sdk: Sdk
): Promise<IntentServiceState> {
  const intents = new Intents({ fetch: makeIntentFetch(sdk) })
  try {
    // The id given: cozy-interapp would read the first parameter only
    const service = await withTimeout(
      intents.createService(intentId, window),
      CLIENT_ANSWER_TIMEOUT_MS
    )
    return service === null ? failed('failed') : { status: 'ready', service }
  } catch (error: unknown) {
    console.error('[intents] Cannot start the service', error)
    return failed(
      error instanceof SdkError && error.status === 403 ? 'forbidden' : 'failed'
    )
  }
}

/** The platform client signed in with the id token, then the service */
async function signInAndStart(
  intentId: string,
  platformURL: string,
  idToken: string
): Promise<IntentServiceState> {
  let sdk: Sdk
  try {
    sdk = await ensureSdkSignedIn(platformURL, idToken)
  } catch (error: unknown) {
    console.error('[intents] The stack refused the token', error)
    return failed('unavailable')
  }
  return startService(intentId, sdk)
}

/**
 * The cozy-interapp service of the intent the page is for: signs the client
 * of the user's platform (cozy-stack) in with their id token (sdkSession,
 * shared with the Drive picker), reads the intent, then waits for the data of
 * the client (the app that framed the page). Started once, in an Effect, as
 * it talks to the stack and to the page around: a second handshake would
 * answer the client twice. Used by IntentPage.
 */
export function useIntentService(intentId: string): IntentServiceState {
  const platformURL = useAppSelector(selectPlatformURL)
  const idToken = useAppSelector(state => state.user.tokens?.id_token)
  const [state, setState] = useState<IntentServiceState>({ status: 'loading' })
  const startedRef = useRef(false)
  // Out of a frame there is no client to answer
  const isFramed = window.parent !== window

  useEffect(() => {
    if (startedRef.current || !isFramed || !platformURL || !idToken) return
    startedRef.current = true
    void signInAndStart(intentId, platformURL, idToken).then(setState)
  }, [intentId, isFramed, platformURL, idToken])

  return isFramed && platformURL && idToken ? state : failed('unavailable')
}
