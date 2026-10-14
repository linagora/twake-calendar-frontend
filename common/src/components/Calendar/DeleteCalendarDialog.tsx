import { Calendar } from '@common/types/CalendarTypes'
import { makeDisplayName } from '@common/utils/makeDisplayName'
import { renameDefault } from '@common/utils/renameDefault'
import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@linagora/twake-mui'
import { Dialog } from '@common/ds/Dialog/Dialog'
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
  // Show the name used by the sidebar rather than the raw '#default' DAV name.
  const calendarName = renameDefault(
    calendars[id].name,
    makeDisplayName(calendars[id]) ?? '',
    t,
    isPersonal
  )

  return (
    <Dialog open={deletePopupOpen} onClose={() => setDeletePopupOpen(false)}>
      <DialogTitle>{t(titleKey, { name: calendarName })}</DialogTitle>

      <DialogContent>
        <DialogContentText>
          {isPersonal
            ? t('calendar.delete.personalWarning')
            : t('calendar.delete.sharedWarning')}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button variant="text" onClick={() => setDeletePopupOpen(false)}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleDeleteConfirm} variant="contained">
          {isPersonal ? t('actions.delete') : t('actions.remove')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
