import type { AlertColor } from '@linagora/twake-mui'
import { Alert, Snackbar } from '@linagora/twake-mui'

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
  return (
    <Snackbar
      open={open}
      autoHideDuration={2000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={severity}
        onClose={() => setOpen(false)}
        sx={{ width: '100%', ...sx }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}
