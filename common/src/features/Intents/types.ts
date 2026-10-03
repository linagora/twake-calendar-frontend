import type { IntentService } from 'cozy-interapp'

export type IntentErrorReason =
  | 'missingIntent'
  | 'tokenExchangeFailed'
  | 'forbidden'
  | 'serviceFailed'

export type IntentMessageReason =
  | IntentErrorReason
  | 'sessionExpired'
  | 'unsupported'
  | 'invalidData'
  | 'crashed'

export type IntentServiceState =
  | { status: 'loading' }
  | {
      status: 'ready'
      service: IntentService
      action: string
      type: string
      data: unknown
    }
  | { status: 'error'; reason: IntentErrorReason }

export interface IntentHandlerProps {
  service: IntentService
  data: unknown
}
