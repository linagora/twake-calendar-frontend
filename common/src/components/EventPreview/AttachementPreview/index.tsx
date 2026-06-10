import { Attachment } from '@common/types/EventsTypes'
import { Box, Button } from '@linagora/twake-mui'
import { useState } from 'react'
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

  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <Box
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
    >
      {attachments
        .slice(0, ATTACHMENT_DISPLAY_LIMIT)
        .map((attachment, index) => (
          <AttachementChip
            key={`${attachment.uri}-${index}`}
            attachment={attachment}
          />
        ))}
      {attachments.length > ATTACHMENT_DISPLAY_LIMIT && (
        <Button
          variant="text"
          size="small"
          sx={{ fontSize: '14px', color: 'text.secondary' }}
          onClick={() => setShowAllAttachments(!showAllAttachments)}
        >
          {showAllAttachments
            ? t('eventPreview.showLess')
            : t('eventPreview.showMore')}
        </Button>
      )}
      {showAllAttachments &&
        attachments
          .slice(ATTACHMENT_DISPLAY_LIMIT)
          .map((attachment, index) => (
            <AttachementChip
              key={`${attachment.uri}-${ATTACHMENT_DISPLAY_LIMIT + index}`}
              attachment={attachment}
            />
          ))}
    </Box>
  )
}
