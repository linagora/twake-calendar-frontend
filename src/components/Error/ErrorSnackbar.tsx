import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useAppDispatch } from "../../app/hooks";
import { clearError as calendarClearError } from "../../features/Calendars/CalendarSlice";
import { clearError as userClearError } from "../../features/User/userSlice";

export function ErrorSnackbar({
  error,
  type,
}: {
  error: string | null;
  type: "user" | "calendar";
}) {
  const dispatch = useAppDispatch();
  const handleCloseSnackbar = () => {
    dispatch(type === "calendar" ? calendarClearError() : userClearError());
  };

  return (
    <Snackbar
      open={!!error}
      onClose={handleCloseSnackbar}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity="error"
        onClose={handleCloseSnackbar}
        sx={{ width: "100%" }}
        action={
          <Button color="inherit" size="small" onClick={handleCloseSnackbar}>
            OK
          </Button>
        }
      >
        {error}
      </Alert>
    </Snackbar>
  );
}

export function EventErrorSnackbar({
  messages,
  onClose,
}: {
  messages: string[];
  onClose: () => void;
}) {
  const open = messages.length > 0;
  const summary =
    messages.length === 1
      ? messages[0]
      : `${messages.length} events with errors`;

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity="error"
        onClose={onClose}
        sx={{ width: "100%" }}
        action={
          <Button color="inherit" size="small" onClick={onClose}>
            OK
          </Button>
        }
      >
        {summary}
      </Alert>
    </Snackbar>
  );
}
