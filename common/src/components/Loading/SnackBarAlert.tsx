import type { ReactNode } from 'react'
import type { AlertColor } from '@linagora/twake-mui'
import { Alert, Snackbar } from '@linagora/twake-mui'

export function SnackbarAlert({
  open,
  setOpen,
  message,
  severity = 'success',
  autoHideDuration = 2000,
  sx,
  action
}: {
  open: boolean
  setOpen: (o: boolean) => void
  message: string
  severity?: AlertColor
  autoHideDuration?: number
  action?: ReactNode
  sx?: object
}): JSX.Element {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={(_event, reason) => {
        if (reason === 'clickaway') return
        setOpen(false)
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={severity}
        action={action}
        onClose={() => setOpen(false)}
        sx={{ width: '100%', ...sx }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}
