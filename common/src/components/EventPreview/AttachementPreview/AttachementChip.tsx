import { Attachment } from '@common/types/Attachment'
import { FileTypeFolder, getFileTypeIcon, Icon } from '@linagora/twake-icons'
import { Box, Chip, radius, Tooltip, Typography } from '@linagora/twake-mui'
import React, { MouseEvent } from 'react'
import CloseIcon from '@mui/icons-material/Close'

export const AttachementChip: React.FC<{
  attachment: Attachment
  onDelete?: (e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => void
}> = ({ attachment, onDelete }) => {
  const filename = attachment.x_filename ?? ''
  const lastDot = filename.lastIndexOf('.')
  const hasExtension = lastDot > 0 && lastDot < filename.length - 1
  const name = hasExtension ? filename.slice(0, lastDot) : filename
  const extension = hasExtension ? filename.slice(lastDot) : ''
  const isDirectory = !attachment.fmttype && !hasExtension

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

  const openFile = (): void => {
    if (!safeHref) return
    window.open(safeHref, '_blank', 'noopener noreferrer')
  }

  const label = (
    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
      <Typography
        variant="body2"
        sx={{
          flexShrink: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100px'
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
  )

  /**
   * We have an issue with @linagora/twake-mui@4.3.0
   * This version contains new override of Chip component
   * But The style of some component like: Accordion, ButtonGroup,... are not correct as version 2.0.0
   * TO DO:
   * - Temporarily custom the style for Chip component in calendar
   * - When a fix version of @linagora/twake-mui is available => Remove the custom style of Chip component
   */
  return (
    <Tooltip title={filename} placement="top">
      <Box>
        <Chip
          color="secondary"
          sx={{
            borderRadius: radius.md
          }}
          icon={
            <Icon
              icon={
                isDirectory
                  ? FileTypeFolder
                  : getFileTypeIcon(filename, attachment.fmttype)
              }
            />
          }
          label={label}
          onDelete={onDelete}
          deleteIcon={<CloseIcon sx={{ width: '16px', height: '16px' }} />}
          onClick={openFile}
        />
      </Box>
    </Tooltip>
  )
}
