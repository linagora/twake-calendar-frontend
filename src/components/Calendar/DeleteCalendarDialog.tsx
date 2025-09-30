import Dialog from "@mui/material/Dialog";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

export function DeleteCalendarDialog({
  deletePopupOpen,
  setDeletePopupOpen,
  calendars,
  id,
  isPersonnal,
  handleDeleteConfirm,
}: {
  deletePopupOpen: boolean;
  setDeletePopupOpen: (e: boolean) => void;
  calendars: Record<string, Calendars>;
  id: string;
  isPersonnal: boolean;
  handleDeleteConfirm: () => void;
}) {
  return (
    <Dialog open={deletePopupOpen} onClose={() => setDeletePopupOpen(false)}>
      <DialogTitle>Remove {calendars[id].name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to remove this calendar?{" "}
          {isPersonnal
            ? "You will loose all events in this calendar."
            : "You will loose access to its events. You will still be able to add it back later."}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeletePopupOpen(false)}>Cancel</Button>
        <Button onClick={handleDeleteConfirm} variant="contained">
          {isPersonnal ? "Delete" : "Remove"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
