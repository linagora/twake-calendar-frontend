import { Alert, Snackbar } from "@linagora/twake-mui";
import type { AlertColor } from "@linagora/twake-mui";

export function SnackbarAlert({
  open,
  setOpen,
  message,
  severity = "success",
}: {
  open: boolean;
  setOpen: Function;
  message: string;
  severity?: AlertColor;
}) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={2000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={severity}
        onClose={() => setOpen(false)}
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
