import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Box, IconButton, TextField } from "@mui/material";
import { useState } from "react";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { SnackbarAlert } from "../Loading/SnackBarAlert";

export function AccessTab({ calendar }: { calendar: Calendars }) {
  const calDAVLink = `${(window as any).CALENDAR_BASE_URL}${calendar.link.replace(".json", "")}`;
  const [open, setOpen] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(calDAVLink);
    setOpen(true);
  };

  return (
    <>
      <Box mt={2}>
        <TextField
          disabled
          fullWidth
          label="CalDAV access"
          value={calDAVLink}
          slotProps={{
            input: {
              endAdornment: (
                <IconButton onClick={handleCopy} edge="end">
                  <ContentCopyIcon />
                </IconButton>
              ),
            },
          }}
        />
      </Box>
      <SnackbarAlert setOpen={setOpen} open={open} message="Link copied!" />
    </>
  );
}
