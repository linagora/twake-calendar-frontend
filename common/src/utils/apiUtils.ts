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

let isRedirectingToSso = false

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
        state: loginurl.state
      })
    )
    redirectTo(loginurl.redirectTo)
  } catch (error) {
    isRedirectingToSso = false
    console.error('SSO Redirect failed:', error)
    throw new HTTPError(response, request, options)
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
  if (!hasAuthHeader) {
    return response
  }

  // Only redirect to SSO if we're sure token is invalid (not just missing)
  await redirectSSO(response, request, options)
}

export const api: KyInstance = ky.extend({
  prefixUrl: window.CALENDAR_BASE_URL,
  retry: {
    limit: RETRY_CONFIG.maxRetries,
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

        if (!headers.has('Authorization')) {
          const raw = sessionStorage.getItem('tokenSet')
          const saved = raw
            ? (JSON.parse(raw) as TokenEndpointResponse &
                TokenEndpointResponseHelpers)
            : null
          const access_token = saved?.access_token
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

export function redirectTo(url: URL): void {
  window.location.assign(url)
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
