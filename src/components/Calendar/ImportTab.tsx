import { useAppSelector } from "@/app/hooks";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@linagora/twake-mui";
import { useEffect, useState } from "react";
import { useI18n } from "twake-i18n";
import { CalendarItemList } from "./CalendarItemList";
import { SettingsTab } from "./SettingsTab";

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
    <>
      {/* Form group 1: Select file button - first group, margin top 0 */}
      {importMode === "file" && (
        <Box mt={0}>
          <Button
            variant="outlined"
            component="label"
            size="medium"
            sx={{ borderRadius: "12px" }}
          >
            {t("common.select_file")}
            <input
              type="file"
              hidden
              accept=".ics"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {importFile && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ marginTop: "6px" }}
            >
              {importFile.name}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ marginTop: "6px" }}
          >
            {t("calendar.import_file_description")}
          </Typography>
        </Box>
      )}

      {/* Form group 2: URL field */}
      {importMode === "url" && (
        <Box mt={0}>
          <TextField
            fullWidth
            label={t("calendar.ics_feed_url")}
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            size="small"
            margin="dense"
            sx={{
              "&.MuiFormControl-root.MuiFormControl-marginDense": {
                marginTop: "6px",
                marginBottom: 0,
              },
            }}
          />
        </Box>
      )}

      {/* Form group 3: Import to */}
      <Box mt={2}>
        <FormControl
          fullWidth
          size="small"
          margin="dense"
          sx={{
            "&.MuiFormControl-root.MuiFormControl-marginDense": {
              marginTop: "6px",
              marginBottom: 0,
            },
          }}
        >
          <InputLabel id="import-to-label">
            {t("calendar.import_to")}
          </InputLabel>
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
      </Box>

      {/* Form group 4: SettingsTab (when importing to new calendar) */}
      {importTarget === "new" && (
        <Box mt={2}>
          <SettingsTab {...newCalParams} />
        </Box>
      )}
    </>
  );
}
