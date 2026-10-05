import type { AlertColor } from '@linagora/twake-mui'
import { Alert, Snackbar } from '@linagora/twake-mui'
import { useMessageDuration } from './useMessageDuration'

export function SnackbarAlert({
  open,
  setOpen,
  message,
  severity = 'success',
  sx
}: {
  open: boolean
  setOpen: (o: boolean) => void
  message: string
  severity?: AlertColor
  sx?: object
}): JSX.Element {
  const autoHideDuration = useMessageDuration(2000, severity)
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        // an error interrupts, a confirmation waits for a pause (RGAA 7.5)
        role={severity === 'error' ? 'alert' : 'status'}
        severity={severity}
        onClose={() => setOpen(false)}
        sx={{ width: '100%', ...sx }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}
