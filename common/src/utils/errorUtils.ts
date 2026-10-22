import { RejectedError } from '@common/features/Calendars/types/RejectedError'

export function formatReduxError(error: unknown): string {
  if (!error) return 'Unknown error'

  if (typeof error === 'string') return error

  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return (error as { message: string }).message
    }
  }

  return 'Unexpected error occurred'
}

export function httpStatusOf(err: unknown): number | undefined {
  return typeof err === 'object' && err !== null && 'response' in err
    ? (err as { response?: { status?: number } }).response?.status
    : undefined
}

export function toRejectedError(err: unknown): RejectedError {
  return { message: formatReduxError(err), status: httpStatusOf(err) }
}

/**
 * Message to store for a rejected thunk. The message of a failed request is
 * untranslated and may carry internal URLs and ids (e.g. "Request failed with
 * status code 500 Internal Server Error: PUT http://…"), so the translated
 * fallback is used instead, unless the message is itself a translation key.
 */
export function rejectedErrorMessage(
  rejection: RejectedError | undefined,
  fallback: string
): string {
  const message = rejection?.message
  return message?.startsWith('TRANSLATION:') ? message : fallback
}
