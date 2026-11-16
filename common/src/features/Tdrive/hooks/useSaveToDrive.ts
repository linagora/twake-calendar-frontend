import { useEffect, useRef, useState } from 'react'
import Intents from 'cozy-interapp'
import { useAppSelector } from '@common/app/hooks'
import { selectPlatformURL } from '@common/app/selectors/selectPlatformURL'
import { Attachment } from '@common/types/Attachment'
import { ensureSdkSignedIn } from '@common/utils/sdkSession'
import { isDriveAttachmentUrl } from '../helpers/driveUpload'
import { makeIntentFetch } from './useTdrivePicker'

type StartedIntent = Promise<unknown> & { stop: () => void }
type UploadIntent = Promise<unknown> & {
  start: (container: HTMLElement) => StartedIntent
}

const UPLOAD_TIMEOUT_MS = 120000

type UploadStatus = 'idle' | 'saving' | 'success' | 'error'

function canStartUpload(
  available: boolean,
  active: AbortController | null,
  status: UploadStatus
): boolean {
  return available && !active && status !== 'success'
}

function stopActiveIntent(
  intentRef: React.RefObject<StartedIntent | null>
): void {
  if (intentRef.current) {
    intentRef.current.stop()
    intentRef.current = null
  }
}

function awaitIntentWithAbort(
  intent: UploadIntent,
  started: StartedIntent,
  signal: AbortSignal
): Promise<unknown> {
  // stop() only takes effect after creation has completed.
  void intent
    .then(() => {
      if (signal.aborted) started.stop()
      return
    })
    .catch(() => undefined)

  const aborted = new Promise<never>((_resolve, reject) => {
    signal.addEventListener(
      'abort',
      () => {
        started.stop()
        reject(new Error('Upload interrupted'))
      },
      { once: true }
    )
  })

  return Promise.race([started, aborted])
}

interface RunUploadIntentParams {
  platformURL: string
  idToken: string
  attachment: Attachment
  containerRef: React.RefObject<HTMLDivElement | null>
  intentRef: React.RefObject<StartedIntent | null>
  signal: AbortSignal
}

async function runUploadIntent({
  platformURL,
  idToken,
  attachment,
  containerRef,
  intentRef,
  signal
}: RunUploadIntentParams): Promise<unknown> {
  // Reuse Calendar's authenticated platform session to create the intent.
  // SDK sign-in is transport authentication, not UPLOAD intent data.
  signal.throwIfAborted()
  let onAbort!: () => void
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = (): void => reject(new Error('Upload interrupted'))
    signal.addEventListener('abort', onAbort, { once: true })
  })
  const sdk = await Promise.race([
    ensureSdkSignedIn(platformURL, idToken),
    aborted
  ]).finally(() => signal.removeEventListener('abort', onAbort))
  signal.throwIfAborted()
  const container = containerRef.current
  if (!container) throw new Error('Upload container unavailable')
  const intent = new Intents({ fetch: makeIntentFetch(sdk) }).create(
    'UPLOAD',
    'io.cozy.files',
    {
      url: attachment.uri,
      folderId: 'io.cozy.files.root-dir',
      name: attachment.x_filename?.trim() ?? ''
    }
  ) as UploadIntent
  const started = intent.start(container)
  intentRef.current = started
  return awaitIntentWithAbort(intent, started, signal)
}

interface SaveToDriveState {
  available: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  status: UploadStatus
  save: () => Promise<void>
  dismiss: () => void
}

export function useSaveToDrive(attachment: Attachment): SaveToDriveState {
  const platformURL = useAppSelector(selectPlatformURL)
  const idToken = useAppSelector(state => state.user.tokens?.id_token)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<AbortController | null>(null)
  const intentRef = useRef<StartedIntent | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const isDriveAttachment = isDriveAttachmentUrl(
    attachment.uri,
    window.WORKPLACE_FQDN_FALLBACK
  )
  const available = Boolean(
    window.TDRIVE_ENABLED &&
    idToken &&
    isDriveAttachment &&
    attachment.hasDisplayableFilename()
  )

  useEffect(
    () => (): void => {
      activeRef.current?.abort()
      intentRef.current?.stop()
    },
    []
  )

  const save = async (): Promise<void> => {
    if (!platformURL || !idToken) return
    if (!canStartUpload(available, activeRef.current, status)) return
    const controller = new AbortController()
    activeRef.current = controller
    // A timeout has an ambiguous outcome: do not automatically retry an upload.
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)
    setStatus('saving')
    try {
      const result = await runUploadIntent({
        platformURL,
        idToken,
        attachment,
        containerRef,
        intentRef,
        signal: controller.signal
      })
      if (!controller.signal.aborted) setStatus(result ? 'success' : 'idle')
    } catch {
      // Never log errors containing share tokens or signed download URLs.
      if (containerRef.current) setStatus('error')
    } finally {
      clearTimeout(timeout)
      stopActiveIntent(intentRef)
      activeRef.current = null
    }
  }

  return {
    available,
    containerRef,
    status,
    save,
    dismiss: () => setStatus('idle')
  }
}
