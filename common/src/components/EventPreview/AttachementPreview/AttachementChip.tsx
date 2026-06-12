import { Attachment } from '@common/types/Attachment'
import { Link, radius } from '@linagora/twake-mui'
import { Box, Typography } from '@linagora/twake-mui'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
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
        <InsertDriveFileIcon fontSize="small" />
        <Typography noWrap variant="body2" sx={{ maxWidth: 160 }}>
          {attachment.x_filename ?? ''}
        </Typography>
        {endAddorments && endAddorments}
      </Box>
    </Link>
  )
}
