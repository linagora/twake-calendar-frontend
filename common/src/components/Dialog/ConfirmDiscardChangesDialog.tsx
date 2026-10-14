import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@linagora/twake-mui'
import { Dialog } from '@common/ds/Dialog/Dialog'
import React from 'react'
import { useI18n } from 'twake-i18n'

interface ConfirmDiscardChangesDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export const ConfirmDiscardChangesDialog: React.FC<
  ConfirmDiscardChangesDialogProps
> = ({ open, onCancel, onConfirm }) => {
  const { t } = useI18n()
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{t('editModeDialog.discardChanges.title')}</DialogTitle>
      <DialogContent>
        <Typography>{t('editModeDialog.discardChanges.body')}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} variant="outlined" color="secondary">
          {t('editModeDialog.discardChanges.continueEditing')}
        </Button>
        <Button onClick={onConfirm} variant="contained">
          {t('editModeDialog.discardChanges.discard')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDiscardChangesDialog
