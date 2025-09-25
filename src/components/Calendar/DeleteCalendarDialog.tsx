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
  handleDeleteConfirm,
}: {
  deletePopupOpen: boolean;
  setDeletePopupOpen: Function;
  calendars: Record<string, Calendars>;
  id: string;
  handleDeleteConfirm: () => void;
}) {
  return (
    <Dialog open={deletePopupOpen} onClose={() => setDeletePopupOpen(false)}>
      <DialogTitle>Delete the calendar?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to remove {calendars[id].name}? This action
          cannot be undone. You will not have access to this calendar and its
          events.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeletePopupOpen(false)}>Cancel</Button>
        <Button onClick={handleDeleteConfirm} variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
