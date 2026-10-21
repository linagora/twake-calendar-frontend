import { addAuthorization, redirectOnUnauthorized } from '@linagora/twake-oidc'
import ky, { type KyInstance, type KyRequest } from 'ky'
import { assertWebSocketAlive, getRetryDelay } from '@linagora/twake-websocket'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const RETRY_CONFIG = {
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 120000
}

// ky also retries PUT and DELETE by default. A failed event PUT was then
// silently replayed for minutes while the user saw nothing, and re-creating
// the event produced a duplicate once a replay went through. Only safe
// methods are retried: writes fail fast so the caller can report them.
const RETRIED_METHODS = ['get', 'head', 'options', 'trace']

export const api: KyInstance = ky.extend({
  prefixUrl: window.CALENDAR_BASE_URL,
  retry: {
    limit: RETRY_CONFIG.maxRetries,
    methods: RETRIED_METHODS,
    backoffLimit: RETRY_CONFIG.maxDelay,
    delay: attemptCount =>
      getRetryDelay(attemptCount - 1, {
        initialDelay: RETRY_CONFIG.initialDelay,
        maxDelay: RETRY_CONFIG.maxDelay
      })
  },
  hooks: {
    beforeRequest: [
      addAuthorization,
      async (request: KyRequest): Promise<void> => {
        if (MUTATING_METHODS.has(request.method)) {
          await assertWebSocketAlive()
        }
      }
    ],
    beforeRetry: [
      ({ request, error, retryCount }): void => {
        console.warn(
          `[API Retry] Attempt ${retryCount}/${RETRY_CONFIG.maxRetries}`,
          {
            url: request.url,
            error: error?.message
          }
        )
      }
    ],

    afterResponse: [redirectOnUnauthorized]
  }
})

export function isValidUrl(string?: string): URL | boolean {
  let url

  try {
    url = new URL(string ?? '')
  } catch {
    return false
  }
  return url
}

export async function importFile(file: File): Promise<unknown> {
  const response = await api.post(
    `api/files?mimetype=${file.type}&name=${file.name}&size=${file.size}`,
    { body: await file.text() }
  )
  return await response.json()
}
