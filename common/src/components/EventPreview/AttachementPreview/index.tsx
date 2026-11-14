import { Attachment } from '@common/types/Attachment'
import { Box, Button } from '@linagora/twake-mui'
import React, { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { AttachementChip } from './AttachementChip'

const ATTACHMENT_DISPLAY_LIMIT = 2

interface AttachementPreviewProps {
  attachments: Attachment[]
  isOrganizer?: boolean
}

export const AttachementPreview: React.FC<AttachementPreviewProps> = ({
  attachments,
  isOrganizer
}) => {
  const { t } = useI18n()
  const [showAllAttachments, setShowAllAttachments] = useState(false)

  // Attachments positioned by third party clients (e.g. inline CID references)
  // carry no filename and would render as an empty, broken chip: filter them out.
  const displayableAttachments = attachments?.filter(attachment =>
    attachment.hasDisplayableFilename()
  )

  if (!displayableAttachments?.length) {
    return null
  }

  return (
    <Box
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
    >
      {renderAttachments({
        attachments: displayableAttachments,
        slice: 'first',
        isOrganizer
      })}
      {showAllAttachments &&
        renderAttachments({
          attachments: displayableAttachments,
          slice: 'rest',
          isOrganizer
        })}
      {displayableAttachments.length > ATTACHMENT_DISPLAY_LIMIT && (
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
    </Box>
  )
}

const renderAttachments = ({
  attachments,
  slice,
  isOrganizer
}: {
  attachments: Attachment[]
  slice: 'first' | 'rest'
  isOrganizer?: boolean
}): React.JSX.Element[] => {
  const sliced =
    slice === 'first'
      ? attachments.slice(0, ATTACHMENT_DISPLAY_LIMIT)
      : attachments.slice(ATTACHMENT_DISPLAY_LIMIT)

  return sliced.map((attachment, index) => (
    <AttachementChip
      key={`${attachment.uri}-${slice === 'rest' ? ATTACHMENT_DISPLAY_LIMIT + index : index}`}
      attachment={attachment}
      isOrganizer={isOrganizer}
    />
  ))
}
