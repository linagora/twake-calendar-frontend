import { Attachment } from '@common/types/Attachment'
import { getFileTypeIcon, Icon } from '@linagora/twake-icons'
import { Box, Link, radius, Tooltip, Typography } from '@linagora/twake-mui'
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
  }
}

export const AttachementChip: React.FC<{
  attachment: Attachment
  endAddorments?: ReactElement
}> = ({ attachment, endAddorments }) => {
  const filename = attachment.x_filename ?? ''
  const lastDot = filename.lastIndexOf('.')
  const hasExtension = lastDot > 0 && lastDot < filename.length - 1
  const name = hasExtension ? filename.slice(0, lastDot) : filename
  const extension = hasExtension ? filename.slice(lastDot) : ''
  const fileIcon = (
    <Icon icon={getFileTypeIcon(filename, attachment.fmttype)} size={24} />
  )

  const safeHref = React.useMemo(() => {
    try {
      const url = new URL(attachment.uri, window.location.origin)
      return ['http:', 'https:'].includes(url.protocol)
        ? url.toString()
        : undefined
    } catch {
      return undefined
    }
  }, [attachment.uri])

  return (
    <Tooltip title={filename} placement="top">
      <Link
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        underline="none"
        sx={{
          textDecoration: 'none',
          '&:hover': { textDecoration: 'none' }
        }}
      >
        <Box sx={{ ...chipStyle, width: '150px' }}>
          <Box sx={{ mt: '2px', flexShrink: 0 }}>{fileIcon}</Box>
          <Box sx={{ width: 0, flex: 1, display: 'flex' }}>
            <Typography
              variant="body2"
              sx={{
                flexShrink: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {name}
            </Typography>
            {extension && (
              <Typography
                variant="body2"
                sx={{
                  flexShrink: 0,
                  maxWidth: '85%',
                  wordBreak: 'break-all'
                }}
              >
                {extension}
              </Typography>
            )}
          </Box>
          {endAddorments}
        </Box>
      </Link>
    </Tooltip>
  )
}
