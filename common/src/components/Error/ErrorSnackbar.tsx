import { useAppDispatch } from '@common/app/hooks'
import { clearError as calendarClearError } from '@common/features/Calendars/CalendarSlice'
import { clearError as userClearError } from '@common/features/User/UserSlice'
import { Alert, Button, Snackbar } from '@linagora/twake-mui'
import { translateErrorMessage } from '@common/utils/translateErrorMessage'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'

export function ErrorSnackbar({
  error,
  type
}: {
  error: string | null
  type: 'user' | 'calendar'
}) {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  // The error is cleared as soon as the snackbar closes, while its exit
  // transition still shows it: keep displaying the last one meanwhile
  const [shownError, setShownError] = useState(error)
  if (error && error !== shownError) setShownError(error)

  const handleCloseSnackbar = () => {
    dispatch(type === 'calendar' ? calendarClearError() : userClearError())
  }

  const getErrorMessage = () => {
    if (!shownError) return t('error.unknown')
    return translateErrorMessage(shownError, t)
  }

  return (
    // twake-mui hides every snackbar after 2s by default: an error stays until "Ok"
    <Snackbar
      open={!!error}
      autoHideDuration={null}
      onClose={handleCloseSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        variant="filled"
        severity="error"
        onClose={handleCloseSnackbar}
        sx={{ width: '100%' }}
        action={
          <Button
            variant="text"
            color="inherit"
            size="small"
            onClick={handleCloseSnackbar}
          >
            {t('common.ok')}
          </Button>
        }
      >
        {getErrorMessage()}
      </Alert>
    </Snackbar>
  )
}

export function EventErrorSnackbar({
  messages,
  onClose
}: {
  messages: string[]
  onClose: () => void
}) {
  const { t } = useI18n()
  const open = messages.length > 0

  const summary =
    messages.length === 1
      ? messages[0]
      : t('error.multipleEvents', { smart_count: messages.length })

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        variant="filled"
        severity="error"
        onClose={onClose}
        sx={{ width: '100%' }}
        action={
          <Button variant="text" color="inherit" size="small" onClick={onClose}>
            {t('common.ok')}
          </Button>
        }
      >
        {summary}
      </Alert>
    </Snackbar>
  )
}
