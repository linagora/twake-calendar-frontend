import { Alert, Button, Snackbar } from "@linagora/twake-mui";
import { useI18n } from "twake-i18n";

export function WebSocketStatusSnackbar({
  message,
  severity,
  onClose,
}: {
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Snackbar
      open={!!message}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={severity}
        onClose={onClose}
        sx={{ width: "100%" }}
        action={
          <Button color="inherit" size="small" onClick={onClose}>
            {t("common.ok")}
          </Button>
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
