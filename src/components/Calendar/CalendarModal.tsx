import { useEffect, useState } from "react";
import {
 createCalendarAsync,
  patchACLCalendarAsync,
  patchCalendarAsync,
} from "../../features/Calendars/CalendarSlice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  TextField,
  Button,

  Tabs,
  Tab,
  ToggleButton,
  Box,
  ToggleButtonGroup,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import { ColorPicker } from "../../components/Calendar/CalendarColorPicker";
import PublicIcon from "@mui/icons-material/Public";
import LockIcon from "@mui/icons-material/Lock";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import WebAssetTwoToneIcon from "@mui/icons-material/WebAssetTwoTone";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import { SnackbarAlert } from "../../components/Loading/SnackBarAlert";

function CalendarPopover({
  open,
  onClose,
  calendar,
}: {
  open: boolean;
  onClose: (
    event: object | null,
    reason: "backdropClick" | "escapeKeyDown"
  ) => void;
  calendar?: Calendars;
}) {
  const dispatch = useAppDispatch();
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";

  const [name, setName] = useState(calendar?.name ?? "");
  const [description, setDescription] = useState(calendar?.description ?? "");
  const [color, setColor] = useState(calendar?.color ?? "");
  const [tab, setTab] = useState<"settings" | "access" | "import">("settings");
  const [visibility, setVisibility] = useState<"private" | "public">("public");
  const [importedContent, setImportedContent] = useState(null);

  const [toggleDesc, setToggleDesc] = useState(false);
  useEffect(() => {
    if (open) {
      if (calendar) {
        setName(calendar.name);
        setDescription(calendar.description ?? "");
        setColor(calendar.color ?? "");
        setVisibility(calendar.visibility ?? "public");
      } else {
        setName("");
        setDescription("");
        setColor("");
        setVisibility("public");
      }
    }
  }, [calendar, open]);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (trimmedName) {
      const calId = calendar ? calendar.id : crypto.randomUUID();

      if (calendar?.id) {
        dispatch(
          patchCalendarAsync({
            calId: calendar.id,
            calLink: calendar.link,
            patch: { name: trimmedName, desc: trimmedDesc, color },
          })
        );
        if (visibility !== calendar.visibility) {
          dispatch(
            patchACLCalendarAsync({
              calId: calendar.id,
              calLink: calendar.link,
              request: visibility === "public" ? "{DAV:}read" : "",
            })
          );
        }
      } else {
        dispatch(
          createCalendarAsync({
            name: trimmedName,
            desc: trimmedDesc,
            color,
            userId,
            calId,
          })
        );
        dispatch(
          patchACLCalendarAsync({
            calId: `${userId}/${calId}`,
            calLink: `/calendars/${userId}/${calId}.json`,
            request: visibility === "public" ? "{DAV:}read" : "",
          })
        );
      }

      handleClose({}, "backdropClick");
    }
  };

  const handleClose = (
    e: {},
    reason: "backdropClick" | "escapeKeyDown"
  ): void => {
    onClose(e, reason);
    setName("");
    setDescription("");
    setColor("");
    setTab("settings");
    setVisibility("public");
    setToggleDesc(false);
  };

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => handleClose(e, reason)}
      maxWidth="lg"
      slotProps={{
        paper: {
          sx: {
            width: "40vw",
          },
        },
      }}
    >
      <DialogTitle>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab
            value={"settings"}
            label={calendar ? "Settings" : "Add new calendar"}
          />
          {calendar && <Tab value={"access"} label="Access" />}
          {/* <Tab value={"import"} label="Import" /> */}
        </Tabs>
      </DialogTitle>
      <DialogContent>

        {tab === "access" && calendar && <AccessTab calendar={calendar} />}
        {tab === "settings" && (
          <SetttingTab
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            color={color}
            setColor={setColor}
            visibility={visibility}
            setVisibility={setVisibility}
            calendar={calendar}
          />
        )}
        {tab === "import" && (
          <ImportTab
            setImportedContent={setImportedContent}
            importedContent={importedContent}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          onClick={(e) => handleClose({}, "backdropClick")}
        >
          Cancel
        </Button>
        <Button
          disabled={!name.trim()}
          variant="contained"
          onClick={handleSave}
        >
          {calendar ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CalendarPopover;

function ImportTab({
  importedContent,
  setImportedContent,
}: {
  importedContent: any;
  setImportedContent: Function;
}) {
  const [importMode, setImportMode] = useState<"file" | "url">("file");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importTarget, setImportTarget] = useState("new");

  useEffect(() => {
    // setImportedContent({});
    console.log(importFile);
    console.log(importUrl);
  }, [importFile, importUrl]);

  return (
    <Box mt={2}>
      {/* File / URL toggle */}
      <ToggleButtonGroup
        value={importMode}
        exclusive
        onChange={(e, val) => val && setImportMode(val)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="file">File</ToggleButton>
        <ToggleButton value="url">URL</ToggleButton>
      </ToggleButtonGroup>

      {/* File Upload */}
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
            display="block"
            color="text.secondary"
            mb={2}
          >
            Import events from an ICS file to one of your calendars.
          </Typography>
        </>
      )}

      {/* URL Input */}
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

      {/* Import To */}
      <FormControl fullWidth size="small" sx={{ mt: 2 }}>
        <InputLabel id="import-to-label">Import to</InputLabel>
        <Select
          labelId="import-to-label"
          label="Import to"
          value={importTarget}
          disabled
          onChange={(e) => setImportTarget(e.target.value)}
        >
          <MenuItem value="new">New calendar</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}

function AccessTab({ calendar }: { calendar: Calendars }) {
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

function SetttingTab({
  name,
  setName,
  description,
  setDescription,
  color,
  setColor,
  visibility,
  setVisibility,
  calendar,
}: {
  name: string;
  setName: Function;
  description: string;
  setDescription: Function;
  color: string;
  setColor: Function;
  visibility: "public" | "private";
  setVisibility: Function;
  calendar?: Calendars;
}) {
  const [toggleDesc, setToggleDesc] = useState(Boolean(description));
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const isOwn = calendar?.id.split("/")[0] === userId;
  return (
    <Box mt={2}>
      <TextField
        fullWidth
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        margin="dense"
        variant="outlined"
      />

      {/* Description button style */}
      {!toggleDesc && (
        <Button
          variant="outlined"
          size="small"
          onClick={() => setToggleDesc(!toggleDesc)}
          startIcon={<FormatListBulletedIcon />}
        >
          Add description
        </Button>
      )}

      {toggleDesc && (
        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="small"
          margin="dense"
          multiline
          rows={2}
        />
      )}

      {/* Colors */}
      <Box mt={2}>
        <Typography variant="body2" gutterBottom>
          Color
        </Typography>
        <ColorPicker
          onChange={(color) => setColor(color)}
          selectedColor={color}
        />
      </Box>

      {/* Visibility */}
      <Box mt={2}>
        <Typography variant="body2" gutterBottom>
          {isOwn && "New events created will be visible to:"}
          {!isOwn && `${calendar?.owner} gave the right to:`}
        </Typography>
        <ToggleButtonGroup
          value={visibility}
          exclusive
          disabled={!isOwn}
          onChange={(e, val) => val && setVisibility(val)}
          size="small"
        >
          <ToggleButton value="public">
            <PublicIcon fontSize="small" />
            {isOwn ? "All" : "Read"}
          </ToggleButton>
          {isOwn && (
            <ToggleButton value="private">
              <LockIcon fontSize="small" />
              You
            </ToggleButton>
          )}
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}
