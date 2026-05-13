import { useEffect, useRef } from 'react'
import { useAppSelector } from '@/app/hooks'
import {
  Box,
  Button,
  Fade,
  Paper,
  Stack,
  Typography
} from '@linagora/twake-mui'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ReplayIcon from '@mui/icons-material/Replay'
import { useI18n } from 'twake-i18n'

interface ErrorProps {
  isCrashFallback?: boolean
  errorBoundaryMessage?: Error
}

export const Error: React.FC<ErrorProps> = ({
  isCrashFallback,
  errorBoundaryMessage
}) => {
  const { t } = useI18n()
  const userError = useAppSelector(state => state.user.error)
  const calendarError = useAppSelector(state => state.calendars.error)
  const initialError = useRef(userError || calendarError)

  useEffect(() => {
    if (!initialError.current && !isCrashFallback) {
      window.location.replace('/')
    }
  }, [isCrashFallback])

  const errorMessage =
    userError ||
    calendarError ||
    (isCrashFallback ? errorBoundaryMessage?.message : t('error.unknown'))

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3
        }}
      >
        <Paper
          elevation={3}
          sx={{
            borderRadius: 4,
            p: 6,
            textAlign: 'center',
            maxWidth: 420,
            width: '100%'
          }}
        >
          <Stack spacing={2} alignItems="center">
            <Box
              sx={{
                color: 'error.main',
                borderRadius: '50%',
                width: 72,
                height: 72,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 40 }} />
            </Box>

            <Typography variant="h5" fontWeight={600}>
              {t('error.title')}
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 2, width: '100%', wordBreak: 'break-all' }}
            >
              {errorMessage}
            </Typography>

            <Button
              variant="contained"
              color="error"
              startIcon={<ReplayIcon />}
              onClick={() => (window.location.href = '/')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                py: 1,
                boxShadow: 'none'
              }}
            >
              {t('error.retry')}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Fade>
  )
}
