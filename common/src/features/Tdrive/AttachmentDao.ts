import { Attachment } from '@common/types/Attachment'
import { api } from '@common/utils/apiUtils'
import { isHTTPError } from 'ky'

// The side service rejects an upload without a content type
const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

export type AttachmentUploadFailure =
  'unavailable' | 'rejected' | 'tooLarge' | 'timeout' | 'failed'

// The statuses of docs/apis/tdrive-attachment-upload.md in the side service
const FAILURE_BY_STATUS: Record<number, AttachmentUploadFailure> = {
  // Drive attachment storage is disabled: the route is not registered
  404: 'unavailable',
  // Invalid file name or type, or no Drive instance found for the user
  400: 'rejected',
  413: 'tooLarge',
  504: 'timeout'
}

/**
 * Uploads a file to the Calendar folder of the user's Drive, through the side
 * service, and returns the attachment pointing at its public read-only link.
 */
export async function uploadAttachment(file: File): Promise<Attachment> {
  const response = await api.post('api/attachments', {
    body: file,
    headers: {
      'Content-Type': file.type || DEFAULT_CONTENT_TYPE,
      'X-Filename': encodeURIComponent(file.name)
    },
    // A large file takes longer to send than the default timeout allows: the
    // side service bounds the Drive upload itself
    timeout: false
  })
  const { uri } = await response.json<{ uri: string }>()
  return new Attachment(uri, file.type || undefined, file.name)
}

/**
 * What to tell the user about a failed upload, or null when there is nothing
 * to tell: a 401 already sends them to sign in again.
 */
export function toAttachmentUploadFailure(
  error: unknown
): AttachmentUploadFailure | null {
  if (!isHTTPError(error)) return 'failed'
  if (error.response.status === 401) return null
  // A 502 and anything undocumented: Drive failed upstream
  return FAILURE_BY_STATUS[error.response.status] ?? 'failed'
}
