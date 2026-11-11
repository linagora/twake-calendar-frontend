/** The page of the intent services (cozy-stack `href` of the manifest) */
export const INTENTS_PATH = '/intents'

/**
 * Where the SSO comes back to the intents page (its own redirect URI): any
 * page may frame it, unlike the callback of the calendar
 */
export const INTENTS_CALLBACK_PATH = '/intents/callback'

const INTENTS_PATH_PATTERN = /^\/intents\/?$/i
const INTENTS_CALLBACK_PATTERN = /^\/intents\/callback\/?$/i
// Every path under /intents: never the calendar, which no other app frames
const UNDER_INTENTS_PATTERN = /^\/intents(\/|$)/i
// It ends up in a URL of the stack, called with a token
const INTENT_ID_PATTERN = /^[A-Za-z0-9_-]+$/

/**
 * The id of the intent the page serves (`/intents?intent=<id>`), null on
 * another path or for an id that is no cozy-stack id
 */
export function parseIntentPath(path: string): string | null {
  const url = new URL(path, 'https://app.invalid')
  if (!INTENTS_PATH_PATTERN.test(url.pathname)) return null
  const intentId = url.searchParams.get('intent')
  return intentId !== null && INTENT_ID_PATTERN.test(intentId) ? intentId : null
}

/** A path of the intents page, its callback included */
export function isUnderIntentsPath(pathname: string): boolean {
  return UNDER_INTENTS_PATTERN.test(pathname)
}

export function isIntentsCallbackPath(pathname: string): boolean {
  return INTENTS_CALLBACK_PATTERN.test(pathname)
}

/** The redirect URI of the intents page, on the origin of the app's one */
export function intentsRedirectUri(appRedirectUri: string): string {
  return new URL(INTENTS_CALLBACK_PATH, appRedirectUri).href
}
