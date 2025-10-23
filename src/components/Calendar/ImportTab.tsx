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
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
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
    setDescription: Function;
    color: Record<string, string>;
    setColor: Function;
    visibility: "public" | "private";
    setVisibility: Function;
  };
}) {
  const [importMode, setImportMode] = useState<"file" | "url">("file");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const calendars = useAppSelector((state) => state.calendars.list);
  const personnalCalendars = Object.keys(calendars).filter(
    (id) => id.split("/")[0] === userId
  );

  useEffect(() => {
    setImportedContent(importMode === "file" ? importFile : null);
  }, [importFile, importUrl, importMode]);

  return (
    <Box mt={2}>
      <ToggleButtonGroup
        value={importMode}
        exclusive
        onChange={(e, val) => val && setImportMode(val)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="file">File</ToggleButton>
        {/* <ToggleButton value="url">URL</ToggleButton> */}
      </ToggleButtonGroup>

      {importMode === "file" && (
        <>
          <Button variant="outlined" component="label" sx={{ mb: 1 }}>
            Select file
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
            Import events from an ICS file to one of your calendars.
          </Typography>
        </>
      )}

      {importMode === "url" && (
        <TextField
          fullWidth
          label="ICS feed URL"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          size="small"
          margin="dense"
        />
      )}

      <FormControl fullWidth size="small" sx={{ mt: 2 }}>
        <InputLabel id="import-to-label">Import to</InputLabel>
        <Select
          labelId="import-to-label"
          label="Import to"
          value={importTarget}
          onChange={(e) => setImportTarget(e.target.value)}
        >
          <MenuItem value="new">New calendar</MenuItem>
          {personnalCalendars.map((id) => (
            <MenuItem key={id} value={id}>
              {calendars[id].name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {importTarget === "new" && <SettingsTab {...newCalParams} />}
    </Box>
  );
}
