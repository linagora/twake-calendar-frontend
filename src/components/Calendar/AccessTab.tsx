import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Box, IconButton, TextField } from "@mui/material";
import { useState } from "react";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { SnackbarAlert } from "../Loading/SnackBarAlert";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";

export function AccessTab({ calendar }: { calendar: Calendars }) {
  const { t } = useI18n();
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
          label={t("calendar.caldav_access")}
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
      <SnackbarAlert
        setOpen={setOpen}
        open={open}
        message={t("common.link_copied")}
      />
    </>
  );
}
