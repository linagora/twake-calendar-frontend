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

// Start of text or a character that cannot belong to a parameter name, so that
// `barcode=` or `status-code=` are not taken for `code=`.
const NAME_BOUNDARY = '^|[^\\w-]'

// Each character of a name may be percent-encoded (`%6Awt` decodes to `jwt`).
const SENSITIVE_NAMES = SENSITIVE_PARAMS.map(acceptEncodedCharacters).join('|')

const SENSITIVE_PARAM_REGEX = new RegExp(
  `(${NAME_BOUNDARY})(${SENSITIVE_NAMES})=[^&#\\s"'<>]*`,
  'gi'
)
// The same parameters inside a percent-encoded nested URL (redirect_uri,
// return...): `%3Fjwt%3D<value>`, the value ending at the next encoded `&`/`#`.
const ENCODED_SENSITIVE_PARAM_REGEX = new RegExp(
  `(%3F|%26|%23|%3B|${NAME_BOUNDARY})(${SENSITIVE_NAMES})%3D(?:[^&#\\s"'<>%]|%(?!26|23)[0-9A-F]{2})*`,
  'gi'
)
const BOOKING_TOKEN_PATH_REGEX = /(\/booking\/confirmed\/)[^/?#\s"'<>]+/gi
// Unicode classes: internationalized mailboxes and domains (ünal@例え.jp) are
// masked too. \p{M} keeps combining marks (decomposed accents, Indic scripts).
// A domain only accepts percent-encoded non-ASCII bytes (%80 to %FF, UTF-8): the
// encoded separators (%40, %2C...) still end it, which keeps the scan linear and
// what follows the address unmasked.
// The text is cut into runs of address characters (local part characters and
// `@`). Inside a run, an address is only looked for at the start of a local
// part (start of the run, after an `@`) or right where the previous address
// ended, as in `alice@example.org2bob@example.net`: starting at every position
// would scan the rest of the run again each time, in time quadratic in its
// length.
const LOCAL_PART_SKIP_REGEX = /[\p{L}\p{M}\p{N}._%+-]*@*/uy
const ADDRESS_RUN_REGEX =
  /(?<![\p{L}\p{M}\p{N}._%+@-])[\p{L}\p{M}\p{N}._%+@-]+/gu
const EMAIL_AT_POSITION_REGEX =
  /[\p{L}\p{M}\p{N}._%+-]+(?:@|%40)(?:[\p{L}\p{M}\p{N}.-]|%[89A-F][0-9A-F])+\.(?:[\p{L}\p{M}]|%[89A-F][0-9A-F]){2,}/iuy

const MAX_DEPTH = 10

/**
 * Masks the sensitive parameters, the booking tokens and the email addresses
 * found anywhere in a free text (messages, exception values, log arguments).
 */
export function scrubText(text: string): string {
  return text
    .replace(SENSITIVE_PARAM_REGEX, `$1$2=${FILTERED}`)
    .replace(ENCODED_SENSITIVE_PARAM_REGEX, `$1$2%3D${FILTERED}`)
    .replace(BOOKING_TOKEN_PATH_REGEX, `$1${FILTERED}`)
    .replace(ADDRESS_RUN_REGEX, maskEmailsInRun)
}

function maskEmailsInRun(run: string): string {
  let masked = ''
  let position = 0
  while (position < run.length) {
    const addressEnd = emailEndAt(run, position)
    if (addressEnd !== undefined) {
      masked += EMAIL_MASK
      position = addressEnd
    } else {
      const nextStart = nextLocalPartStart(run, position)
      masked += run.slice(position, nextStart)
      position = nextStart
    }
  }
  return masked
}

function emailEndAt(run: string, position: number): number | undefined {
  EMAIL_AT_POSITION_REGEX.lastIndex = position
  return EMAIL_AT_POSITION_REGEX.test(run)
    ? EMAIL_AT_POSITION_REGEX.lastIndex
    : undefined
}

// Skips the local part starting at `position` and the `@` that follow it. A run
// only holds such characters, so this always moves forward.
function nextLocalPartStart(run: string, position: number): number {
  LOCAL_PART_SKIP_REGEX.lastIndex = position
  LOCAL_PART_SKIP_REGEX.test(run)
  return Math.max(LOCAL_PART_SKIP_REGEX.lastIndex, position + 1)
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

function acceptEncodedCharacters(name: string): string {
  return [...name].map(acceptEncodedCharacter).join('')
}

// Names match case-insensitively, so do their encoded letters: `%4A` or `%6A`.
function acceptEncodedCharacter(character: string): string {
  const encodings = [
    ...new Set([character.toLowerCase(), character.toUpperCase()])
  ].map(variant => `%${variant.charCodeAt(0).toString(16)}`)
  return `(?:${[character, ...encodings].join('|')})`
}

function isUrlKey(key: string): boolean {
  return /^(url|from|to|referer|referrer)$/i.test(key)
}

function isDroppedKey(key: string): boolean {
  return /^(query_string|cookies|authorization)$/i.test(key)
}
