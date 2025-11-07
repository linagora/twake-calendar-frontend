import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Box,
  IconButton,
  TextField,
  Button,
  Typography,
  InputAdornment,
} from "@mui/material";
import { useState, useEffect } from "react";
import { getSecretLink } from "../../features/Calendars/CalendarApi";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { FieldWithLabel } from "../Event/components/FieldWithLabel";
import { SnackbarAlert } from "../Loading/SnackBarAlert";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";

export function AccessTab({ calendar }: { calendar: Calendars }) {
  const { t } = useI18n();
  const calDAVLink = `${(window as any).CALENDAR_BASE_URL}${calendar.link.replace(".json", "")}`;

  const [secretLink, setSecretLink] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetchSecret() {
      const existing = await getSecretLink(
        calendar.link.replace(".json", ""),
        false
      );
      setSecretLink(existing.secretLink);
    }
    fetchSecret();
  }, [calendar.link]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setOpen(true);
  };

  const handleResetSecretLink = async () => {
    const newSecret = await getSecretLink(
      calendar.link.replace(".json", ""),
      true
    );
    setSecretLink(newSecret.secretLink);
  };

  return (
    <>
      <FieldWithLabel label={t("calendar.caldav_access")} isExpanded={false}>
        <Box mt={2}>
          <TextField
            disabled
            fullWidth
            label={t("calendar.caldav_access")}
            value={calDAVLink}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => handleCopy(calDAVLink)} edge="end">
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </FieldWithLabel>

      <FieldWithLabel label={t("calendar.secretUrl")} isExpanded={false}>
        <Box mt={3} display="flex" alignItems="center" gap={1}>
          <TextField
            disabled
            fullWidth
            label={t("calendar.secretUrl")}
            value={secretLink}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => handleCopy(secretLink)} edge="end">
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" onClick={handleResetSecretLink}>
            {t("actions.reset")}
          </Button>
        </Box>
      </FieldWithLabel>

      <Typography
        variant="body2"
        sx={{ color: "text.secondary", mt: 1, lineHeight: 1.5 }}
      >
        {t("calendar.secretUrlDesc")}
      </Typography>

      <SnackbarAlert
        setOpen={setOpen}
        open={open}
        message={t("common.link_copied")}
      />
    </>
  );
}
