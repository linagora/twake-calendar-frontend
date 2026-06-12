import {
  alpha,
  Box,
  Button,
  IconButton,
  Link,
  useTheme
} from '@linagora/twake-mui'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import { SnackbarAlert } from '@common/components/Loading/SnackBarAlert'
import { ContentCopy as CopyIcon } from '@mui/icons-material'
import Tooltip from '@common/components/Tooltip'

const sanitizeMeetingLink = (raw: string | null): string | null => {
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}

export const VideoLink: React.FC<{
  meetingLink: string | null
  icon?: React.ReactNode
  label?: string
}> = ({ meetingLink, icon, label }) => {
  const { t } = useI18n()
  const theme = useTheme()

  const [openToast, setOpenToast] = useState(false)

  const safeMeetingLink = sanitizeMeetingLink(meetingLink)

  const handleCopyMeetingLink = async (): Promise<void> => {
    if (!safeMeetingLink) return
    try {
      await navigator.clipboard.writeText(safeMeetingLink)
      setOpenToast(true)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  if (!safeMeetingLink) {
    return null
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Link
          href={safeMeetingLink}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ textDecoration: 'none' }}
        >
          <Button
            startIcon={icon}
            variant="contained"
            size="medium"
            sx={{ borderRadius: '4px' }}
          >
            {label || t('eventPreview.joinVideo')}
          </Button>
        </Link>
        <Tooltip title={t('event.form.copyMeetingLink')}>
          <IconButton
            onClick={() => void handleCopyMeetingLink()}
            size="small"
            sx={{ color: alpha(theme.palette.grey[900], 0.9) }}
            aria-label={t('event.form.copyMeetingLink')}
          >
            <CopyIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <SnackbarAlert
        setOpen={setOpenToast}
        open={openToast}
        message={t('event.form.meetCopied')}
      />
    </>
  )
}
