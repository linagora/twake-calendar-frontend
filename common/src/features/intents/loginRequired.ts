// Framed, twake-oidc never goes to the SSO on a 401 of the calendar server:
// it calls the onLoginRequired of the app (index.tsx), once per page load.
// Kept here, so that the intents page can tell the client (IntentPage).
let isLoginRequired = false
const listeners = new Set<() => void>()

/**
 * Records that the session ended (the calendar server answered 401) and tells
 * the subscribers. Called by the onLoginRequired of index.tsx.
 */
export function reportLoginRequired(): void {
  isLoginRequired = true
  listeners.forEach(listener => listener())
}

/**
 * Calls onChange when the session ends. The `subscribe` of
 * useSyncExternalStore in IntentPage.
 *
 * @returns a function that stops listening.
 */
export function subscribeLoginRequired(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

/**
 * Whether the session ended during this page load. The `getSnapshot` of
 * useSyncExternalStore in IntentPage.
 */
export function hasLoginRequired(): boolean {
  return isLoginRequired
}
