const REQUEST_TIMEOUT_MS = 30_000

/** Failure answered by the Cozy stack, with its HTTP status. */
export class CozyStackError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'CozyStackError'
    this.status = status
  }
}

interface FetchCozyIntentJSONOptions {
  cozyURL: string
  accessToken: string
}

/**
 * fetchJSON for cozy-interapp, against the user's Cozy with the token obtained
 * by the token exchange.
 */
export const fetchCozyIntentJSON =
  ({ cozyURL, accessToken }: FetchCozyIntentJSONOptions) =>
  async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const url = `${cozyURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${accessToken}`
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    if (!response.ok) {
      throw new CozyStackError(response.status, await response.text())
    }
    return response.json()
  }
