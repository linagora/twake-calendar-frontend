import { Attachment } from '@common/types/Attachment'
import { getFileTypeIcon, Icon } from '@linagora/twake-icons'
import { Box, Link, radius, Typography } from '@linagora/twake-mui'
import React, { ReactElement } from 'react'

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: radius.sm,
  px: 1,
  py: 0.5,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: 'action.hover'
  },
  height: '44px'
}

export const AttachementChip: React.FC<{
  attachment: Attachment
  endAddorments?: ReactElement
}> = ({ attachment, endAddorments }) => {
  const fileIcon = (
    <Icon
      icon={getFileTypeIcon(attachment.x_filename ?? '', attachment.fmttype)}
      size={24}
    />
  )
  return (
    <Link
      key={`${attachment.uri}`}
      href={attachment.uri}
      target="_blank"
      rel="noopener noreferrer"
      underline="none"
      sx={{
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'none'
        }
      }}
    >
      <Box sx={{ ...chipStyle, width: '150px' }}>
        {fileIcon}
        <Typography noWrap variant="body2" sx={{ maxWidth: 240 }}>
          {attachment.x_filename ?? ''}
        </Typography>
        {endAddorments}
      </Box>
    </Link>
  )
}
