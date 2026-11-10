import { Attachment } from '@common/types/Attachment'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AttachmentUploadFailure,
  toAttachmentUploadFailure,
  uploadAttachment
} from '../AttachmentDao'

export interface PendingUpload {
  id: string
  name: string
  type: string
}

let uploadCount = 0

// Many files dropped at once wait their turn instead of all hitting the side
// service together
export const MAX_PARALLEL_UPLOADS = 3

interface QueuedUpload {
  file: File
  pending: PendingUpload
}

interface UseAttachmentUploadProps {
  attachments: Attachment[]
  setAttachments: (attachments: Attachment[]) => void
}

interface UseAttachmentUploadReturn {
  pendingUploads: PendingUpload[]
  uploadFailure: AttachmentUploadFailure | null
  uploadFiles: (files: File[]) => void
  dismissUploadFailure: () => void
}

/**
 * Uploads files to the Drive and adds each one to the attachments once its
 * public link is back. Up to MAX_PARALLEL_UPLOADS files upload at once, the
 * others are queued, and they are added in the order they finish.
 */
export function useAttachmentUpload({
  attachments,
  setAttachments
}: UseAttachmentUploadProps): UseAttachmentUploadReturn {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
  const [uploadFailure, setUploadFailure] =
    useState<AttachmentUploadFailure | null>(null)

  // Uploads finish after the render that started them: each one adds its
  // attachment to the latest list, including those added by the others
  const attachmentsRef = useRef(attachments)
  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  // A form closed mid-upload drops what comes back
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return (): void => {
      isMountedRef.current = false
    }
  }, [])

  const queueRef = useRef<QueuedUpload[]>([])
  const activeCountRef = useRef(0)

  const uploadFile = useCallback(
    async ({ file, pending }: QueuedUpload): Promise<void> => {
      try {
        const attachment = await uploadAttachment(file)
        if (!isMountedRef.current) return
        const next = [...attachmentsRef.current, attachment]
        attachmentsRef.current = next
        setAttachments(next)
      } catch (error) {
        if (!isMountedRef.current) return
        console.error('Attachment upload failed', error)
        const failure = toAttachmentUploadFailure(error)
        if (failure) setUploadFailure(failure)
      } finally {
        if (isMountedRef.current) {
          setPendingUploads(prev => prev.filter(p => p.id !== pending.id))
        }
      }
    },
    [setAttachments]
  )

  const startQueuedUploads = useCallback((): void => {
    while (
      isMountedRef.current &&
      activeCountRef.current < MAX_PARALLEL_UPLOADS
    ) {
      const queued = queueRef.current.shift()
      if (!queued) return
      activeCountRef.current += 1
      void uploadFile(queued).finally(() => {
        activeCountRef.current -= 1
        startQueuedUploads()
      })
    }
  }, [uploadFile])

  const uploadFiles = useCallback(
    (files: File[]): void => {
      const queued = files.map(file => ({
        file,
        pending: {
          id: `upload-${++uploadCount}`,
          name: file.name,
          type: file.type
        }
      }))
      queueRef.current.push(...queued)
      setPendingUploads(prev => [...prev, ...queued.map(q => q.pending)])
      startQueuedUploads()
    },
    [startQueuedUploads]
  )

  const dismissUploadFailure = useCallback(() => setUploadFailure(null), [])

  return { pendingUploads, uploadFailure, uploadFiles, dismissUploadFailure }
}
