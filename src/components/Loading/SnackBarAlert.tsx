import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

export function SnackbarAlert({
  open,
  setOpen,
  message,
}: {
  open: boolean;
  setOpen: Function;
  message: string;
}) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={2000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={() => setOpen(false)}
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
