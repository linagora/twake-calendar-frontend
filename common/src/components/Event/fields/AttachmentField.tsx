import { AttachementChip } from '@common/components/EventPreview/AttachementPreview/AttachementChip'
import { Attachment } from '@common/types/Attachment'
import type { PendingUpload } from '@common/features/Tdrive/hooks/useAttachmentUpload'
import { isSafeHttpUrl } from '@common/utils/isSafeUrl'
import { Box } from '@linagora/twake-mui'
import { MouseEvent } from 'react'

interface AttachmentFieldProps {
  attachments?: Attachment[]
  setAttachments?: (attachments: Attachment[]) => void
  pendingUploads?: PendingUpload[]
}

export const AttachmentField: React.FC<AttachmentFieldProps> = ({
  attachments,
  setAttachments,
  pendingUploads = []
}) => {
  const handleRemove = (
    e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>,
    index: number
  ): void => {
    e.preventDefault()
    e.stopPropagation()
    const newAttachments = (attachments || []).filter((_, i) => i !== index)
    setAttachments?.(newAttachments)
  }

  if (!attachments?.length && !pendingUploads.length) {
    return null
  }

  // In expanded mode, show all attachments with remove IconButtons
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1
      }}
    >
      {(attachments ?? []).map((attachment, index) => {
        if (!isSafeHttpUrl(attachment.uri)) return null
        return (
          <AttachementChip
            key={`${attachment.uri}-${index}`}
            attachment={attachment}
            onDelete={e => handleRemove(e, index)}
          />
        )
      })}
      {pendingUploads.map(upload => (
        <AttachementChip
          key={upload.id}
          attachment={new Attachment('', upload.type || undefined, upload.name)}
          loading
        />
      ))}
    </Box>
  )
}
