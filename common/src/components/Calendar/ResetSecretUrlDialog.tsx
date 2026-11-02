import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@linagora/twake-mui'
import { Dialog } from '@common/ds/Dialog/Dialog'
import { useI18n } from 'twake-i18n'

export function ResetSecretUrlDialog({
  open,
  onCancel,
  onConfirm
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}): JSX.Element {
  const { t } = useI18n()

  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{t('calendar.resetSecretUrl.title')}</DialogTitle>

      <DialogContent>
        <DialogContentText>
          {t('calendar.resetSecretUrl.body')}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        {/* the reset cuts off every subscriber: the safe choice has the focus */}
        <Button variant="text" onClick={onCancel} autoFocus>
          {t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          {t('actions.reset')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
