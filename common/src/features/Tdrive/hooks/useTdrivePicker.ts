import { useAppSelector } from '@common/app/hooks'
import { selectPlatformURL } from '@common/app/selectors/selectPlatformURL'
import { ensureSdkSignedIn } from '@common/utils/sdkSession'
import type { Sdk } from '@linagora/twake-sdk'
import Intents from 'cozy-interapp'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { TdriveFile } from '../types'

const INTENT_REQUEST_TIMEOUT_MS = 30000

/**
 * The fetch cozy-interapp sends its intent requests with: the SDK client signs
 * them with its token, and refreshes the token once on a 401.
 */
export const makeIntentFetch =
  (sdk: Sdk) =>
  (method: string, path: string, body?: unknown): Promise<unknown> =>
    sdk.fetchJSON(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(INTENT_REQUEST_TIMEOUT_MS)
    })

interface UseTdrivePickerReturn {
  isOpen: boolean
  containerRef: React.RefObject<HTMLDivElement>
  openPickerError: string | null
  openPicker: () => Promise<void>
  closePicker: () => void
  dismissOpenPickerError: () => void
  onReadyToUse: (callback: () => void) => void
}

interface UseTdrivePickerProps {
  onFilesSelected: (files: TdriveFile[]) => void
}

function convertSingleResult(doc: Record<string, unknown>): TdriveFile | null {
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined

  const id = str(doc.id) ?? str(doc._id) ?? str(doc.file_id)
  const name = str(doc.name) ?? str(doc.filename) ?? 'Unnamed'
  const url = str(doc.url) ?? str(doc.sharingLink)

  if (!id || !url) return null

  return {
    id,
    name,
    url,
    type: 'sharingLink',
    mimeType: str(doc.mimeType) ?? null
  }
}

function convertIntentResultToFiles(result: unknown): TdriveFile[] {
  if (!result || typeof result !== 'object') return []

  if (Array.isArray(result)) {
    return result
      .map(doc => convertSingleResult(doc as Record<string, unknown>))
      .filter((f): f is TdriveFile => f !== null)
  }

  const single = convertSingleResult(result as Record<string, unknown>)
  return single ? [single] : []
}

interface PickerCancellation {
  cancelled: boolean
  whenCancelled: Promise<void>
  cancel: () => void
}

function createPickerCancellation(): PickerCancellation {
  let resolveCancelled!: () => void
  const cancellation: PickerCancellation = {
    cancelled: false,
    whenCancelled: new Promise<void>(resolve => {
      resolveCancelled = resolve
    }),
    cancel: () => {
      cancellation.cancelled = true
      resolveCancelled()
    }
  }
  return cancellation
}

interface StartTdrivePickerOptions {
  platformURL: string
  idToken: string
  containerRef: React.RefObject<HTMLDivElement | null>
  readyCallbackRef: React.MutableRefObject<(() => void) | null>
  cancellationRef: PickerCancellation
  intentRef: React.MutableRefObject<StartedCozyIntent | null>
  t: (key: string) => string
}

// cozy-interapp attaches stop() to the promise returned by start(), not to
// the intent returned by create(): stop() destroys the intent iframe.
type StartedCozyIntent = Promise<unknown> & { stop: () => void }

// The intent returned by create() is the intent creation request promise.
type CozyIntent = Promise<unknown> & {
  start: (
    element: HTMLElement,
    options: { onReady?: () => void; onReadyToUse?: () => void }
  ) => StartedCozyIntent
}

async function startTdrivePicker({
  platformURL,
  idToken,
  containerRef,
  readyCallbackRef,
  cancellationRef,
  intentRef,
  t
}: StartTdrivePickerOptions): Promise<TdriveFile[]> {
  const sdk = await ensureSdkSignedIn(platformURL, idToken)

  if (cancellationRef.cancelled) {
    return []
  }

  const intents = new Intents({ fetch: makeIntentFetch(sdk) })

  const intent = intents.create(
    'PICK',
    'io.cozy.files',
    {
      theme: { type: 'light' },
      multiple: true,
      sharingLink: { label: t('tdrive.addAsAttachment') },
      downloadLink: null,
      displayCloseButton: true
    },
    ['GET']
  ) as CozyIntent

  if (!containerRef.current) {
    throw new Error('Picker container is not mounted')
  }

  const startedIntent = intent.start(containerRef.current, {
    onReady: () => {
      console.info('Tdrive picker iframe loaded')
    },
    onReadyToUse: () => {
      readyCallbackRef.current?.()
    }
  })
  intentRef.current = startedIntent

  // stop() is a no-op until the intent creation request completes: stop again
  // once it has, in case the picker got closed meanwhile.
  // A failed creation request is reported by start(): nothing to stop then.
  intent
    .then(() => {
      if (cancellationRef.cancelled) startedIntent.stop()
      return
    })
    .catch(() => undefined)

  // A stopped intent never settles: let cancellation end the wait.
  const result = await Promise.race([
    startedIntent,
    cancellationRef.whenCancelled
  ])

  if (cancellationRef.cancelled) {
    return []
  }

  return convertIntentResultToFiles(result)
}

export function useTdrivePicker({
  onFilesSelected
}: UseTdrivePickerProps): UseTdrivePickerReturn {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [openPickerError, setOpenPickerError] = useState<string | null>(null)

  const platformURL = useAppSelector(selectPlatformURL)
  const idToken = useAppSelector(state => state.user.tokens?.id_token)

  const containerRef = useRef<HTMLDivElement>(null)
  const intentRef = useRef<StartedCozyIntent | null>(null)
  const readyCallbackRef = useRef<(() => void) | null>(null)
  const activeCancellationRef = useRef<PickerCancellation | null>(null)

  const onReadyToUse = useCallback((callback: () => void) => {
    readyCallbackRef.current = callback
  }, [])

  const openPicker = useCallback(async () => {
    setOpenPickerError(null)

    const validationError =
      (isOpen && 'alreadyOpen') ||
      (!platformURL && 'tdriveUrlNotConfigured') ||
      (!idToken && 'tdriveTokenUnavailable') ||
      null

    if (validationError) {
      if (validationError !== 'alreadyOpen') {
        setOpenPickerError(validationError)
      }
      return
    }

    const cancellationRef = createPickerCancellation()
    activeCancellationRef.current = cancellationRef

    setIsOpen(true)

    try {
      const files = await startTdrivePicker({
        platformURL: platformURL as string,
        idToken: idToken as string,
        containerRef,
        readyCallbackRef,
        cancellationRef,
        intentRef,
        t
      })

      if (cancellationRef.cancelled) return

      if (files.length > 0) {
        onFilesSelected(files)
      }
    } catch (error) {
      if (cancellationRef.cancelled) return
      console.error('Failed to open Tdrive picker:', error)
      setOpenPickerError('tdrivePickerFailed')
    } finally {
      if (!cancellationRef.cancelled) {
        intentRef.current = null
        readyCallbackRef.current = null
        setIsOpen(false)
      }
    }
  }, [isOpen, platformURL, idToken, onFilesSelected, t])

  const closePicker = useCallback(() => {
    activeCancellationRef.current?.cancel()
    activeCancellationRef.current = null
    intentRef.current?.stop()
    intentRef.current = null
    readyCallbackRef.current = null
    setIsOpen(false)
  }, [])

  const dismissOpenPickerError = useCallback(() => {
    setOpenPickerError(null)
  }, [])

  useEffect(
    () => () => {
      activeCancellationRef.current?.cancel()
      intentRef.current?.stop()
    },
    []
  )

  return {
    isOpen,
    containerRef,
    openPickerError,
    openPicker,
    closePicker,
    dismissOpenPickerError,
    onReadyToUse
  }
}
