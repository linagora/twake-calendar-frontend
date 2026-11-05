/**
 * Removes secrets and personal data from what leaves the browser for
 * observability (Sentry). The URLs of the application carry bearer
 * credentials: the participation JWT (?jwt=), the booking confirmation token
 * (/booking/confirmed/<token>), the OIDC code and state of the login callback,
 * the WebSocket ticket, and email addresses in API queries.
 */

const FILTERED = '[Filtered]'
const EMAIL_MASK = '[email]'

const SENSITIVE_PARAMS = [
  'jwt',
  'code',
  'state',
  'ticket',
  'email',
  'bookingConfirmationToken',
  'access_token',
  'id_token',
  'refresh_token',
  'session_state'
]

const SENSITIVE_PARAM_REGEX = new RegExp(
  `([?&#;]|\\b)(${SENSITIVE_PARAMS.join('|')})=[^&#\\s"'<>]*`,
  'gi'
)
const BOOKING_TOKEN_PATH_REGEX = /(\/booking\/confirmed\/)[^/?#\s"'<>]+/gi
const EMAIL_REGEX = /[A-Z0-9._%+-]+(?:@|%40)[A-Z0-9.-]+\.[A-Z]{2,}/gi

const MAX_DEPTH = 10

/**
 * Masks the sensitive parameters, the booking tokens and the email addresses
 * found anywhere in a free text (messages, exception values, log arguments).
 */
export function scrubText(text: string): string {
  return text
    .replace(SENSITIVE_PARAM_REGEX, `$1$2=${FILTERED}`)
    .replace(BOOKING_TOKEN_PATH_REGEX, `$1${FILTERED}`)
    .replace(EMAIL_REGEX, EMAIL_MASK)
}

/**
 * Drops the query string and the fragment of a URL, then masks what remains
 * in its path (booking tokens, email addresses in DAV paths).
 */
export function scrubUrl(url: string): string {
  const cut = url.search(/[?#]/)
  const withoutQuery = cut === -1 ? url : url.slice(0, cut)
  return scrubText(withoutQuery)
}

/**
 * Walks a value and scrubs every string it holds. Keys named like URLs get
 * their query string dropped, the others are masked in place.
 */
export function scrubDeep<T>(value: T, key = '', depth = 0): T {
  if (typeof value === 'string') {
    return (isUrlKey(key) ? scrubUrl(value) : scrubText(value)) as T
  }
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).map(item =>
      scrubDeep(item, key, depth + 1)
    ) as T
  }
  const result: Record<string, unknown> = {}
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (isDroppedKey(entryKey)) continue
    result[entryKey] = scrubDeep(entryValue, entryKey, depth + 1)
  }
  return result as T
}

function isUrlKey(key: string): boolean {
  return /^(url|from|to|referer|referrer)$/i.test(key)
}

function isDroppedKey(key: string): boolean {
  return /^(query_string|cookies|authorization)$/i.test(key)
}
