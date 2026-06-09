import { Attachment } from '@common/types/EventsTypes'
import { Box } from '@linagora/twake-mui'
import { useState } from 'react'
import { AttachementChip, MoreAttachementChip } from './AttachementChip'

interface AttachementPreviewProps {
  attachments: Attachment[]
}

export const AttachementPreview: React.FC<AttachementPreviewProps> = ({
  attachments
}) => {
  const [showAllAttachments, setShowAllAttachments] = useState(false)
  if (!attachments || attachments.length === 0) {
    return null
  }
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1
      }}
    >
      {!showAllAttachments && (
        <>
          <AttachementChip attachment={attachments[0]} />
          <AttachementChip attachment={attachments[1]} />
        </>
      )}
      {showAllAttachments &&
        attachments.map((attachment, index) => {
          return (
            <AttachementChip
              key={`${attachment.uri}-${index}`}
              attachment={attachment}
            />
          )
        })}
      <MoreAttachementChip
        count={attachments.length - 2}
        showMore={showAllAttachments}
        onClick={() => setShowAllAttachments(!showAllAttachments)}
      />
    </Box>
  )
}
