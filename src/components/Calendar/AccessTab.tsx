import {
  exportCalendar,
  getSecretLink,
} from "@/features/Calendars/CalendarApi";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@linagora/twake-mui";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { useEffect, useState } from "react";
import { useI18n } from "twake-i18n";
import { ErrorSnackbar } from "../Error/ErrorSnackbar";
import { FieldWithLabel } from "../Event/components/FieldWithLabel";
import { SnackbarAlert } from "../Loading/SnackBarAlert";

export function AccessTab({ calendar }: { calendar: Calendar }) {
  const { t } = useI18n();
  const calDAVLink = `${window.CALENDAR_BASE_URL}${calendar.link.replace(".json", "")}`;

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

  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const exportedData = await exportCalendar(
        calendar.link.replace(".json", "")
      );
      const blob = new Blob([exportedData], {
        type: "text/calendar",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${calendar.id.split("/")[1]}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError((e as Error).message);
      setExportLoading(false);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <FieldWithLabel label={t("calendar.caldav_access")} isExpanded={false}>
        <Box mt={2}>
          <TextField
            disabled
            fullWidth
            label=""
            inputProps={{ "aria-label": t("calendar.caldav_access") }}
            value={calDAVLink}
            size="small"
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
            label=""
            inputProps={{ "aria-label": t("calendar.secretUrl") }}
            value={secretLink}
            size="small"
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
          <Button
            variant="contained"
            color="secondary"
            onClick={handleResetSecretLink}
            sx={{ borderRadius: "4px" }}
          >
            {t("actions.reset")}
          </Button>
        </Box>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", mt: 1, lineHeight: 1.5 }}
        >
          {t("calendar.secretUrlDesc")}
        </Typography>
      </FieldWithLabel>

      <FieldWithLabel label={t("calendar.exportCalendar")} isExpanded={false}>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", m: 1, lineHeight: 1.5 }}
        >
          {t("calendar.exportDesc")}
        </Typography>

        <Button
          variant="contained"
          color="secondary"
          onClick={handleExport}
          startIcon={!exportLoading && <FileDownloadOutlinedIcon />}
          disabled={exportLoading}
          sx={{ borderRadius: "4px" }}
        >
          {exportLoading ? (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={18} />
              {t("actions.exporting")}
            </Box>
          ) : (
            t("actions.export")
          )}
        </Button>
      </FieldWithLabel>

      <SnackbarAlert
        setOpen={setOpen}
        open={open}
        message={t("common.link_copied")}
      />
      <ErrorSnackbar error={exportError} type="calendar" />
    </>
  );
}
