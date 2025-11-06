import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useAppDispatch } from "../../app/hooks";
import { clearError as calendarClearError } from "../../features/Calendars/CalendarSlice";
import { clearError as userClearError } from "../../features/User/userSlice";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";

export function ErrorSnackbar({
  error,
  type,
}: {
  error: string | null;
  type: "user" | "calendar";
}) {
  const { t } = useI18n();
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
            {t("common.ok")}
          </Button>
        }
      >
        {error || t("error.unknown")}
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
  const { t } = useI18n();
  const open = messages.length > 0;

  const summary =
    messages.length === 1
      ? messages[0]
      : t("error.multipleEvents", { count: messages.length });

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
            {t("common.ok")}
          </Button>
        }
      >
        {summary}
      </Alert>
    </Snackbar>
  );
}
