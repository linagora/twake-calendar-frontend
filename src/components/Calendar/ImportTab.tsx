import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@linagora/twake-mui";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import { CalendarItemList } from "./CalendarItemList";
import { SettingsTab } from "./SettingsTab";
import { useI18n } from "twake-i18n";
import { extractEventBaseUuid } from "../../utils/extractEventBaseUuid";

export function ImportTab({
  userId,
  importTarget,
  setImportTarget,
  setImportedContent,
  newCalParams,
}: {
  userId: string;
  importTarget: string;
  setImportTarget: Function;
  setImportedContent: Function;
  newCalParams: {
    name: string;
    setName: Function;
    description: string;
    setDescription: (d: string) => void;
    color: Record<string, string>;
    setColor: Function;
    visibility: "public" | "private";
    setVisibility: Function;
  };
}) {
  const { t } = useI18n();
  const [importMode, setImportMode] = useState<"file" | "url">("file");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const calendars = useAppSelector((state) => state.calendars.list);
  const personalCalendars = Object.values(calendars).filter(
    (cal) => extractEventBaseUuid(cal.id) === userId
  );

  useEffect(() => {
    setImportedContent(importMode === "file" ? importFile : null);
  }, [importFile, importUrl, importMode]);

  return (
    <Box mt={2}>
      {importMode === "file" && (
        <>
          <Button variant="outlined" component="label" sx={{ mb: 1 }}>
            {t("common.select_file")}
            <input
              type="file"
              hidden
              accept=".ics"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {importFile && (
            <Typography variant="body2" color="text.secondary">
              {importFile.name}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mb={2}
          >
            {t("calendar.import_file_description")}
          </Typography>
        </>
      )}

      {importMode === "url" && (
        <TextField
          fullWidth
          label={t("calendar.ics_feed_url")}
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          size="small"
          margin="dense"
        />
      )}

      <FormControl fullWidth size="small" sx={{ mt: 2 }}>
        <InputLabel id="import-to-label">{t("calendar.import_to")}</InputLabel>
        <Select
          labelId="import-to-label"
          label={t("calendar.import_to")}
          value={importTarget}
          onChange={(e) => setImportTarget(e.target.value)}
        >
          <MenuItem value="new">{t("calendar.new_calendar")}</MenuItem>
          {CalendarItemList(personalCalendars)}
        </Select>
      </FormControl>

      {importTarget === "new" && <SettingsTab {...newCalParams} />}
    </Box>
  );
}
