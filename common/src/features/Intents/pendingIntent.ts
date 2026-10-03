export const INTENT_ROUTE = '/intents'

const PENDING_INTENT_ID_KEY = 'pendingIntentId'

export const getIntentIdFromSearch = (search: string): string | null =>
  new URLSearchParams(search).get('intent') || null

export const isIntentLocation = (pathname: string, search: string): boolean =>
  pathname === INTENT_ROUTE && getIntentIdFromSearch(search) !== null

/**
 * The intent frame leaves for the SSO before it can serve the intent: keep its
 * id so that the login callback brings the frame back to it.
 */
export const rememberPendingIntent = (intentId: string): void => {
  sessionStorage.setItem(PENDING_INTENT_ID_KEY, intentId)
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
