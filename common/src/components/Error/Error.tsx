// 1. Import these directly from official MUI core
import { Fade as MuiFade, Box as MuiBox } from '@mui/material'

// 2. Keep your other UI elements from your library
import { Button, Paper, Stack, Typography } from '@linagora/twake-mui'
import { useEffect, useRef } from 'react'
import { useAppSelector } from '@common/app/hooks'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
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
    (isCrashFallback
      ? errorBoundaryMessage?.message
      : String(t('error.unknown') || 'Unknown Error'))

  return (
    // 3. Use MuiFade and MuiBox here
    <MuiFade in timeout={500}>
      <MuiBox
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
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <MuiBox
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
              <ErrorOutlinedIcon sx={{ fontSize: 40 }} />
            </MuiBox>

            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {t('error.title')}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                mb: 2,
                width: '100%',
                wordBreak: 'break-all'
              }}
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
      </MuiBox>
    </MuiFade>
  )
}
