import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@linagora/twake-mui";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { useI18n } from "twake-i18n";

export function DeleteCalendarDialog({
  deletePopupOpen,
  setDeletePopupOpen,
  calendars,
  id,
  isPersonal,
  handleDeleteConfirm,
}: {
  deletePopupOpen: boolean;
  setDeletePopupOpen: (e: boolean) => void;
  calendars: Record<string, Calendars>;
  id: string;
  isPersonal: boolean;
  handleDeleteConfirm: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dialog open={deletePopupOpen} onClose={() => setDeletePopupOpen(false)}>
      <DialogTitle>
        {t("calendar.delete.title", { name: calendars[id].name })}
      </DialogTitle>

      <DialogContent>
        <DialogContentText>
          {isPersonal
            ? t("calendar.delete.personalWarning")
            : t("calendar.delete.sharedWarning")}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setDeletePopupOpen(false)}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleDeleteConfirm} variant="contained">
          {isPersonal ? t("actions.delete") : t("actions.remove")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
