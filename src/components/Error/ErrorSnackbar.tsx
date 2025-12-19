import { Snackbar } from "twake-mui";
import { Alert } from "twake-mui";
import { Button } from "twake-mui";
import { useAppDispatch } from "../../app/hooks";
import { clearError as calendarClearError } from "../../features/Calendars/CalendarSlice";
import { clearError as userClearError } from "../../features/User/userSlice";
import { useI18n } from "twake-i18n";

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

  const getErrorMessage = () => {
    if (!error) return t("error.unknown");

    // Check if error message is a translation key with params
    // Format: TRANSLATION:key|param1=value1|param2=value2
    if (error.startsWith("TRANSLATION:")) {
      const parts = error.substring(12).split("|");
      const translationKey = parts[0];
      const params: Record<string, string> = {};

      for (let i = 1; i < parts.length; i++) {
        const equalIndex = parts[i].indexOf("=");
        if (equalIndex === -1) continue;
        const key = parts[i].substring(0, equalIndex);
        const value = parts[i].substring(equalIndex + 1);
        if (key && value) {
          try {
            params[key] = decodeURIComponent(value);
          } catch {
            params[key] = value;
          }
        }
      }

      return t(translationKey, params);
    }

    return error;
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
        {getErrorMessage()}
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
