import { HTTPError } from 'ky'

/**
 * Extracts a user-friendly error message from an HTTP error or generic error.
 * Handles common HTTP status codes (404, 401, 403) with localized messages.
 */
export const getHttpErrorMessage = (
  err: unknown,
  t: (key: string) => string
): string => {
  if (err instanceof HTTPError) {
    const status = err.response.status
    if (status === 404) {
      return t('error.eventNotFound')
    }
    if (status === 401 || status === 403) {
      return t('error.invalidOrExpiredToken')
    }
    return err.message
  }
  return err instanceof Error ? err.message : String(err)
}

/**
 * Sanitizes error messages by redacting sensitive tokens.
 * Replaces JWT tokens with 'jwt=...' to prevent leaking credentials in logs/errors.
 */
export const sanitizeErrorMessage = (message: string): string => {
  return message.replace(/jwt=[A-Za-z0-9-_=~./+%]+/g, 'jwt=...')
}

/**
 * Gets a sanitized HTTP error message suitable for display.
 * Combines getHttpErrorMessage with sanitizeErrorMessage for safe error display.
 */
export const getSanitizedHttpErrorMessage = (
  err: unknown,
  t: (key: string) => string
): string => {
  const message = getHttpErrorMessage(err, t)
  return sanitizeErrorMessage(message)
}
