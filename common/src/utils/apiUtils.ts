import { isEmbedPath } from '@common/features/Embed/embeddedCalendar'
import { Auth } from '@common/features/User/oidcAuth'
import { assertWebSocketAlive } from '@common/websocket/connection/lifecycle/assertWebSocketAlive'
import ky, {
  type KyInstance,
  type KyRequest,
  type KyResponse,
  HTTPError,
  type NormalizedOptions
} from 'ky'
import { getRetryDelay } from './getRetryDelay'
import {
  TokenEndpointResponse,
  TokenEndpointResponseHelpers
} from 'openid-client'

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

let isRedirectingToSso = false

type TokenSet = TokenEndpointResponse & TokenEndpointResponseHelpers

/**
 * The tokens of the session, held in memory only: web storage is readable by
 * any script of the page, so a single XSS would hand them over for replay
 * from anywhere. A reload goes through the SSO again, which signs the user
 * back in silently while their SSO session lasts.
 */
let tokenSet: Partial<TokenSet> | null = null

export function setTokenSet(tokens: Partial<TokenSet>): void {
  tokenSet = tokens
}

export function getAccessToken(): string | undefined {
  return tokenSet?.access_token
}

export function clearTokenSet(): void {
  tokenSet = null
}

const redirectSSO = async (
  response: KyResponse,
  request: KyRequest,
  options: NormalizedOptions
): Promise<void> => {
  if (isRedirectingToSso) {
    throw new DOMException('SSO redirect in progress', 'AbortError')
  }
  isRedirectingToSso = true
  try {
    const loginurl = await Auth()

    sessionStorage.setItem(
      'redirectState',
      JSON.stringify({
        code_verifier: loginurl.code_verifier,
        state: loginurl.state,
        returnTo: loginurl.returnTo
      })
    )
    redirectTo(loginurl.redirectTo)
  } catch (error) {
    isRedirectingToSso = false
    console.error('SSO Redirect failed:', error)
    throw new HTTPError(response, request, options)
  }
}

/**
 * Whether a request goes to the Calendar backend, the only one that gets the
 * Calendar access token.
 */
const isCalendarBackendRequest = (request: KyRequest): boolean => {
  try {
    const target = new URL(request.url, window.location.href)
    const backend = new URL(window.CALENDAR_BASE_URL, window.location.href)
    return target.origin === backend.origin
  } catch {
    return false
  }
}

const handleUnauthorizeRequest = async (
  response: KyResponse,
  request: KyRequest,
  options: NormalizedOptions
): Promise<KyResponse | void> => {
  // Check if we're already on login flow to prevent redirect loop
  const currentPath = window.location.pathname
  if (currentPath === '/callback') {
    return response
  }

  // Check if we have a token in the request
  const hasAuthHeader = request.headers.has('Authorization')
  if (!hasAuthHeader || !isCalendarBackendRequest(request)) {
    return response
  }

  // Only redirect to SSO if we're sure token is invalid (not just missing)
  await redirectSSO(response, request, options)
}

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
      async (request: KyRequest): Promise<KyRequest> => {
        const headers = new Headers(request.headers)

        if (
          !headers.has('Authorization') &&
          isCalendarBackendRequest(request)
        ) {
          const access_token = getAccessToken()
          if (access_token) {
            headers.set('Authorization', `Bearer ${access_token}`)
          }
        }

        if (MUTATING_METHODS.has(request.method)) {
          await assertWebSocketAlive()
        }

        return new Request(request, { headers }) as KyRequest
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

    afterResponse: [
      async (request, options, response): Promise<KyResponse> => {
        if (response.status === 401) {
          await handleUnauthorizeRequest(response, request, options)
        }
        return response
      }
    ]
  }
})

/**
 * HTTP client for the services other than the Calendar backend: it never
 * adds the Calendar access token, nor redirects to the SSO on a 401.
 */
export const externalApi: KyInstance = ky.create({})

export function redirectTo(url: URL): void {
  // TwakeSpace owns the browser history of the pages it frames: a frame never
  // adds an entry, so the silent login leaves no dead Back press behind
  if (isEmbedPath(window.location.pathname)) window.location.replace(url)
  else window.location.assign(url)
}

export function getLocation(): string {
  return window.location.href
}

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
