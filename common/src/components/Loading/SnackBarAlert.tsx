import type { AlertColor, AlertProps } from '@linagora/twake-mui'
import { Alert, Button, Snackbar } from '@linagora/twake-mui'
import { forwardRef, ReactNode, JSX } from 'react'

export interface AlertAction {
  label: string
  onClick: () => void
}

interface ActionAlertProps extends Omit<AlertProps, 'action' | 'sx'> {
  message: string
  action?: AlertAction
  sx?: object
}

/**
 * The alert a snackbar shows: a message and an optional text button. It
 * forwards its ref and props: a Snackbar animates its child through them.
 */
export const ActionAlert = forwardRef<HTMLDivElement, ActionAlertProps>(
  function ActionAlert(
    { message, severity = 'success', action, sx, ...props },
    ref
  ) {
    return (
      <Alert
        ref={ref}
        variant="filled"
        severity={severity}
        sx={{ width: '100%', ...sx }}
        action={
          action && (
            <Button
              variant="text"
              color="inherit"
              size="small"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )
        }
        {...props}
      >
        {message}
      </Alert>
    )
  }
)

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
