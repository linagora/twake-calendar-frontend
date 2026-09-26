import { Calendar } from '@common/types/CalendarTypes'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export function DeleteCalendarDialog({
  deletePopupOpen,
  setDeletePopupOpen,
  calendars,
  id,
  isPersonal,
  handleDeleteConfirm
}: {
  deletePopupOpen: boolean
  setDeletePopupOpen: (e: boolean) => void
  calendars: Record<string, Calendar>
  id: string
  isPersonal: boolean
  handleDeleteConfirm: () => void
}) {
  const { t } = useI18n()
  const titleKey = isPersonal
    ? 'calendar.delete.title'
    : 'calendar.delete.removeTitle'

  return (
    <Dialog open={deletePopupOpen} onClose={() => setDeletePopupOpen(false)}>
      <DialogTitle>{t(titleKey, { name: calendars[id].name })}</DialogTitle>

      <DialogContent>
        <DialogContentText>
          {isPersonal
            ? t('calendar.delete.personalWarning')
            : t('calendar.delete.sharedWarning')}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setDeletePopupOpen(false)}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleDeleteConfirm} variant="contained">
          {isPersonal ? t('actions.delete') : t('actions.remove')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
