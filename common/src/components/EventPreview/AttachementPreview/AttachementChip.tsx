import { Attachment } from '@common/types/EventsTypes'
import { Link, radius } from '@linagora/twake-mui'
import { Box, Typography } from '@linagora/twake-mui'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { useI18n } from 'twake-i18n'

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
}> = ({ attachment }) => {
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
        <Typography noWrap variant="body1" sx={{ maxWidth: 160 }}>
          {attachment.x_filename ?? ''}
        </Typography>
      </Box>
    </Link>
  )
}

export const MoreAttachementChip: React.FC<{
  count: number
  onClick: () => void
  showMore: boolean
}> = ({ count, onClick, showMore }) => {
  const { t } = useI18n()
  return (
    <Box sx={{ ...chipStyle }} onClick={onClick}>
      <Typography noWrap variant="body1" sx={{ maxWidth: 160 }}>
        {!showMore && t('eventPreview.attachment.more', { count: count })}
        {showMore && '-'}
      </Typography>
    </Box>
  )
}
