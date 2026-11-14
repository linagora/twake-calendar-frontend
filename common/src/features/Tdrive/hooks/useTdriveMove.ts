import { useAppSelector } from '@common/app/hooks'
import { selectPlatformURL } from '@common/app/selectors/selectPlatformURL'
import { ensureSdkSignedIn } from '@common/utils/sdkSession'
import Intents, { type StartedIntent } from 'cozy-interapp'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MovedDriveFile, SavedDriveFile } from '../types'
import { makeIntentFetch } from './useTdrivePicker'

const MOVE_READY_TIMEOUT_MS = 30000

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined

/**
 * Reads the io.cozy.files document the UPLOAD intent answers with, or null
 * when it lacks what the MOVE intent needs.
 */
export function toSavedDriveFile(document: unknown): SavedDriveFile | null {
  if (!document || typeof document !== 'object') return null
  const doc = document as Record<string, unknown>
  const id = str(doc._id) ?? str(doc.id)
  const dirId = str(doc.dir_id)
  const name = str(doc.name)
  if (!id || !dirId || !name) return null
  return { id, name, dirId }
}

// The MOVE intent answers with the updated documents of the moved files: a
// move across drives may give a file a new id
function toMovedFiles(result: unknown): MovedDriveFile[] {
  if (!Array.isArray(result)) return []
  return result.flatMap(doc => {
    if (!doc || typeof doc !== 'object') return []
    const { _id, name, path } = doc as Record<string, unknown>
    const id = str(_id)
    const fileName = str(name)
    const filePath = str(path)
    return id && fileName && filePath
      ? [{ id, name: fileName, path: filePath }]
      : []
  })
}

interface MoveCancellation {
  cancelled: boolean
  whenCancelled: Promise<void>
  cancel: () => void
}

function createMoveCancellation(): MoveCancellation {
  let resolveCancelled!: () => void
  const cancellation: MoveCancellation = {
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

interface ReadyDeadline {
  expired: Promise<never>
  clear: () => void
}

// Fails a MOVE intent that never becomes ready, e.g. a frame the browser
// refused to display, instead of letting it load forever.
function createReadyDeadline(onExpired: () => void): ReadyDeadline {
  let timer: ReturnType<typeof setTimeout> | undefined
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      onExpired()
      reject(new Error('Tdrive MOVE intent did not become ready in time'))
    }, MOVE_READY_TIMEOUT_MS)
  })
  return { expired, clear: () => clearTimeout(timer) }
}

// stop() is a no-op until the intent creation request completes: stop again
// once it has, in case the intent got closed meanwhile.
// A failed creation request is reported by start(): nothing to stop then.
function stopOnceCreated(
  intent: Promise<unknown>,
  startedIntent: StartedIntent,
  cancellation: MoveCancellation
): void {
  intent
    .then(() => {
      if (cancellation.cancelled) startedIntent.stop()
      return
    })
    .catch(() => undefined)
}

interface StartMoveIntentOptions {
  file: SavedDriveFile
  platformURL: string
  idToken: string
  containerRef: React.RefObject<HTMLDivElement | null>
  readyCallbackRef: React.MutableRefObject<(() => void) | null>
  cancellationRef: MoveCancellation
  intentRef: React.MutableRefObject<StartedIntent | null>
}

/**
 * Runs the MOVE intent on the file in the container and resolves with what
 * the service answered: null when the user cancelled it in the service,
 * undefined when it got closed from here.
 */
async function startMoveIntent({
  file,
  platformURL,
  idToken,
  containerRef,
  readyCallbackRef,
  cancellationRef,
  intentRef
}: StartMoveIntentOptions): Promise<unknown> {
  const sdk = await ensureSdkSignedIn(platformURL, idToken)

  if (cancellationRef.cancelled) {
    return undefined
  }

  const intents = new Intents({ fetch: makeIntentFetch(sdk) })

  // Starts in the folder the file is in, without restricting where it goes
  const intent = intents.create(
    'MOVE',
    'io.cozy.files',
    {
      fileIds: [file.id],
      defaultDirId: file.dirId,
      theme: { type: 'light' }
    },
    ['GET']
  )

  if (!containerRef.current) {
    throw new Error('Move container is not mounted')
  }

  const readyDeadline = createReadyDeadline(() => intentRef.current?.stop())
  const startedIntent = intent.start(containerRef.current, {
    onReady: () => {
      console.info('Tdrive MOVE intent iframe loaded')
    },
    onReadyToUse: () => {
      readyDeadline.clear()
      readyCallbackRef.current?.()
    }
  })
  intentRef.current = startedIntent
  stopOnceCreated(intent, startedIntent, cancellationRef)

  // A stopped intent never settles: let cancellation end the wait.
  const result = await Promise.race([
    startedIntent,
    cancellationRef.whenCancelled,
    readyDeadline.expired
  ]).finally(readyDeadline.clear)

  if (cancellationRef.cancelled) {
    return undefined
  }

  return result
}

export type TdriveMoveError =
  'tdriveUrlNotConfigured' | 'tdriveTokenUnavailable' | 'tdriveMoveFailed'

function getMoveValidationError(
  platformURL: string | null | undefined,
  idToken: string | null | undefined
): TdriveMoveError | null {
  if (!platformURL) return 'tdriveUrlNotConfigured'
  if (!idToken) return 'tdriveTokenUnavailable'
  return null
}

// What the service answered, or failed when the intent could not run
type MoveOutcome = { failed: false; result: unknown } | { failed: true }

async function runMove(options: StartMoveIntentOptions): Promise<MoveOutcome> {
  try {
    return { failed: false, result: await startMoveIntent(options) }
  } catch (error) {
    if (!options.cancellationRef.cancelled) {
      console.error('Failed to open Tdrive MOVE intent:', error)
    }
    return { failed: true }
  }
}

// Stops the running intent, if any, and drops what it would answer
function stopMove(
  activeCancellationRef: React.MutableRefObject<MoveCancellation | null>,
  intentRef: React.MutableRefObject<StartedIntent | null>
): void {
  activeCancellationRef.current?.cancel()
  activeCancellationRef.current = null
  intentRef.current?.stop()
  intentRef.current = null
}

interface UseTdriveMoveProps {
  onMoved: (files: MovedDriveFile[]) => void
  // The user closed the intent without moving anything
  onCancelled?: () => void
}

interface UseTdriveMoveReturn {
  isOpen: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  openMoveError: TdriveMoveError | null
  openMove: (file: SavedDriveFile) => Promise<void>
  closeMove: () => void
  dismissOpenMoveError: () => void
  onReadyToUse: (callback: () => void) => void
}

/**
 * Lets the user move a file of their Drive to the folder of their choice,
 * starting from the folder it is in, through the Drive MOVE intent, in a
 * container the caller renders, e.g. in a TdrivePickerDialog.
 */
export function useTdriveMove({
  onMoved,
  onCancelled
}: UseTdriveMoveProps): UseTdriveMoveReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [openMoveError, setOpenMoveError] = useState<TdriveMoveError | null>(
    null
  )

  const platformURL = useAppSelector(selectPlatformURL)
  const idToken = useAppSelector(state => state.user.tokens?.id_token)

  const containerRef = useRef<HTMLDivElement>(null)
  const intentRef = useRef<StartedIntent | null>(null)
  const readyCallbackRef = useRef<(() => void) | null>(null)
  const activeCancellationRef = useRef<MoveCancellation | null>(null)

  const onReadyToUse = useCallback((callback: () => void) => {
    readyCallbackRef.current = callback
  }, [])

  const openMove = useCallback(
    async (file: SavedDriveFile) => {
      setOpenMoveError(null)
      if (isOpen) return

      const validationError = getMoveValidationError(platformURL, idToken)
      if (validationError) {
        setOpenMoveError(validationError)
        return
      }

      const cancellationRef = createMoveCancellation()
      activeCancellationRef.current = cancellationRef
      setIsOpen(true)

      const outcome = await runMove({
        file,
        platformURL: platformURL as string,
        idToken: idToken as string,
        containerRef,
        readyCallbackRef,
        cancellationRef,
        intentRef
      })
      // A move closed from here has already been cleaned up
      if (cancellationRef.cancelled) return

      intentRef.current = null
      readyCallbackRef.current = null
      setIsOpen(false)

      // The service answers a cancellation with null
      if (outcome.failed) setOpenMoveError('tdriveMoveFailed')
      else if (outcome.result === null) onCancelled?.()
      else onMoved(toMovedFiles(outcome.result))
    },
    [isOpen, platformURL, idToken, onMoved, onCancelled]
  )

  const closeMove = useCallback(() => {
    stopMove(activeCancellationRef, intentRef)
    readyCallbackRef.current = null
    setIsOpen(false)
  }, [])

  const dismissOpenMoveError = useCallback(() => setOpenMoveError(null), [])

  useEffect(() => (): void => stopMove(activeCancellationRef, intentRef), [])

  return {
    isOpen,
    containerRef,
    openMoveError,
    openMove,
    closeMove,
    dismissOpenMoveError,
    onReadyToUse
  }
}
