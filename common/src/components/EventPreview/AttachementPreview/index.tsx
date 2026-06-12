import { Attachment } from '@common/types/Attachment'
import { Box, Button } from '@linagora/twake-mui'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { AttachementChip } from './AttachementChip'

const ATTACHMENT_DISPLAY_LIMIT = 2

interface AttachementPreviewProps {
  attachments: Attachment[]
}

export const AttachementPreview: React.FC<AttachementPreviewProps> = ({
  attachments
}) => {
  const { t } = useI18n()
  const [showAllAttachments, setShowAllAttachments] = useState(false)

  if (!attachments?.length) {
    return null
  }

  return (
    <Box
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
    >
      {renderAttachments({ attachments, slice: 'first' })}
      {attachments.length > ATTACHMENT_DISPLAY_LIMIT && (
        <Button
          variant="text"
          size="small"
          sx={{ color: 'text.secondary' }}
          onClick={() => setShowAllAttachments(!showAllAttachments)}
        >
          {showAllAttachments
            ? t('eventPreview.showLess')
            : t('eventPreview.showMore')}
        </Button>
      )}
      {showAllAttachments && renderAttachments({ attachments, slice: 'rest' })}
    </Box>
  )
}

const renderAttachments: React.FC<{
  attachments: Attachment[]
  slice: 'first' | 'rest'
}> = ({ attachments, slice }) => {
  const sliced =
    slice === 'first'
      ? attachments.slice(0, ATTACHMENT_DISPLAY_LIMIT)
      : attachments.slice(ATTACHMENT_DISPLAY_LIMIT)

  return sliced.map((attachment, index) => (
    <AttachementChip
      key={`${attachment.uri}-${slice === 'rest' ? ATTACHMENT_DISPLAY_LIMIT + index : index}`}
      attachment={attachment}
    />
  ))
}
