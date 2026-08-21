import { useAppSelector } from '@common/app/hooks'
import Intents from 'cozy-interapp'
import { useCallback, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { TdriveFile } from '../types'
import { exchangeToken, fetchIntentJSON } from '../TdriveDao'
import { useTdriveUserContext } from './useTdriveUserContext'

interface UseTdrivePickerReturn {
  isOpen: boolean
  containerRef: React.RefObject<HTMLDivElement>
  openPickerError: string | null
  openPicker: () => Promise<void>
  closePicker: () => void
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

interface StartTdrivePickerOptions {
  tdriveBaseUrl: string
  idToken: string
  containerRef: React.RefObject<HTMLDivElement | null>
  readyCallbackRef: React.MutableRefObject<(() => void) | null>
  cancellationRef: { cancelled: boolean }
  intentRef: React.MutableRefObject<{ stop?: () => void } | null>
  t: (key: string) => string
}

interface CozyIntent {
  start: (
    element: HTMLElement,
    options: { onReady?: () => void; onReadyToUse?: () => void }
  ) => Promise<unknown>
  stop?: () => void
}

async function startTdrivePicker({
  tdriveBaseUrl,
  idToken,
  containerRef,
  readyCallbackRef,
  cancellationRef,
  intentRef,
  t
}: StartTdrivePickerOptions): Promise<{
  files: TdriveFile[]
  intent: { stop?: () => void }
}> {
  const tokenResponse = await exchangeToken(tdriveBaseUrl, idToken)

  if (cancellationRef.cancelled) {
    return { files: [], intent: {} }
  }

  const intents = new Intents({
    fetch: fetchIntentJSON({
      tdriveBaseUrl,
      accessToken: tokenResponse.access_token
    })
  })

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

  intentRef.current = intent

  if (!containerRef.current) {
    throw new Error('Picker container is not mounted')
  }

  const result = await intent.start(containerRef.current, {
    onReady: () => {
      console.info('Tdrive picker iframe loaded')
    },
    onReadyToUse: () => {
      readyCallbackRef.current?.()
    }
  })

  if (cancellationRef.cancelled) {
    return { files: [], intent }
  }

  const files = convertIntentResultToFiles(result)
  return { files, intent }
}

export function useTdrivePicker({
  onFilesSelected
}: UseTdrivePickerProps): UseTdrivePickerReturn {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [openPickerError, setOpenPickerError] = useState<string | null>(null)

  const { tdriveBaseUrl } = useTdriveUserContext()
  const idToken = useAppSelector(state => state.user.tokens?.id_token)

  const containerRef = useRef<HTMLDivElement>(null)
  const intentRef = useRef<{ stop?: () => void } | null>(null)
  const readyCallbackRef = useRef<(() => void) | null>(null)
  const activeCancellationRef = useRef<{ cancelled: boolean } | null>(null)

  const onReadyToUse = useCallback((callback: () => void) => {
    readyCallbackRef.current = callback
  }, [])

  const openPicker = useCallback(async () => {
    setOpenPickerError(null)

    const validationError =
      (isOpen && 'alreadyOpen') ||
      (!tdriveBaseUrl && 'tdriveUrlNotConfigured') ||
      (!idToken && 'tdriveTokenUnavailable') ||
      null

    if (validationError) {
      if (validationError !== 'alreadyOpen') {
        setOpenPickerError(validationError)
      }
      return
    }

    const cancellationRef = { cancelled: false }
    activeCancellationRef.current = cancellationRef

    setIsOpen(true)

    try {
      const { files } = await startTdrivePicker({
        tdriveBaseUrl: tdriveBaseUrl as string,
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
  }, [isOpen, tdriveBaseUrl, idToken, onFilesSelected, t])

  const closePicker = useCallback(() => {
    if (activeCancellationRef.current) {
      activeCancellationRef.current.cancelled = true
      activeCancellationRef.current = null
    }
    if (typeof intentRef.current?.stop === 'function') {
      intentRef.current.stop()
    }
    intentRef.current = null
    readyCallbackRef.current = null
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    containerRef,
    openPickerError,
    openPicker,
    closePicker,
    onReadyToUse
  }
}
