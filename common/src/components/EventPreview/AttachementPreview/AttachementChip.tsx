import { Attachment } from '@common/types/EventsTypes'
import { Link, radius } from '@linagora/twake-mui'
import { Box, Typography } from '@linagora/twake-mui'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'

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
