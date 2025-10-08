import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

interface Props {
  messages: string[];
  onClose: () => void;
}

export function EventErrorSnackbar({ messages, onClose }: Props) {
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
