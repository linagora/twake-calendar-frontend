import type { AuthOptions } from '@common/features/User/oidcAuth'

export const INTENT_ROUTE = '/intents'

const PENDING_INTENT_ID_KEY = 'pendingIntentId'

// The id ends up in a stack URL (/intents/<id>): anything else than the
// characters of a Cozy intent id could reach another route of the stack.
const INTENT_ID_PATTERN = /^[A-Za-z0-9_-]+$/

// Same matching as the server and the router: any case, optional trailing slash
const INTENT_ROUTE_PATTERN = /^\/intents\/?$/i

export const getIntentIdFromSearch = (search: string): string | null => {
  const intentId = new URLSearchParams(search).get('intent')
  return intentId && INTENT_ID_PATTERN.test(intentId) ? intentId : null
}

const isIntentRoute = (pathname: string): boolean =>
  INTENT_ROUTE_PATTERN.test(pathname)

/**
 * The intent frame leaves for the SSO before it can serve the intent: keep its
 * id so that the login callback brings the frame back to it.
 */
export const rememberPendingIntent = (intentId: string): void => {
  sessionStorage.setItem(PENDING_INTENT_ID_KEY, intentId)
}

/**
 * An intent frame cannot show a login form: a dead SSO session must come back
 * as an error, and the login callback must return to the intent. Any other
 * sign in forgets the intent of a frame closed before its callback, which
 * would otherwise hijack this sign in.
 */
export const prepareIntentLogin = (): AuthOptions => {
  const intentId = isIntentRoute(window.location.pathname)
    ? getIntentIdFromSearch(window.location.search)
    : null
  if (!intentId) {
    sessionStorage.removeItem(PENDING_INTENT_ID_KEY)
    return {}
  }

  rememberPendingIntent(intentId)
  return { prompt: 'none' }
}

export const takePendingIntent = (): string | null => {
  const intentId = sessionStorage.getItem(PENDING_INTENT_ID_KEY)
  sessionStorage.removeItem(PENDING_INTENT_ID_KEY)
  return intentId
}

export const buildIntentPath = (
  intentId: string,
  authError?: string
): string => {
  const params = new URLSearchParams({ intent: intentId })
  if (authError) {
    params.set('authError', authError)
  }
  return `${INTENT_ROUTE}?${params.toString()}`
}
