import { useEffect, useState } from "react";
import {
  createCalendarAsync /*, updateCalendarAsync */,
  patchCalendarAsync,
} from "../../features/Calendars/CalendarSlice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  Popover,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  DialogActions,
  ToggleButton,
  Box,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { ColorPicker } from "../../components/Calendar/CalendarColorPicker";
import PublicIcon from "@mui/icons-material/Public";
import LockIcon from "@mui/icons-material/Lock";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import WebAssetTwoToneIcon from "@mui/icons-material/WebAssetTwoTone";
import { Calendars } from "../../features/Calendars/CalendarTypes";

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
  const [tab, setTab] = useState(0);
  const [visibility, setVisibility] = useState("all");
  const [timezone, setTimezone] = useState("CET");

  useEffect(() => {
    if (open) {
      if (calendar) {
        setName(calendar.name);
        setDescription(calendar.description ?? "");
        setColor(calendar.color ?? "");
      } else {
        setName("");
        setDescription("");
        setColor("");
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
      }

      onClose({}, "backdropClick");
    }
  };

  return (
    <Dialog open={open} onClose={(e, reason) => onClose(e, reason)}>
      <DialogTitle>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Add new calendar" />
          <Tab label="Import" />
        </Tabs>{" "}
      </DialogTitle>
      <DialogContent>
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
        <Button
          variant="outlined"
          size="small"
          onClick={() => setDescription(description ? "" : " ")}
          startIcon={<FormatListBulletedIcon />}
        >
          {description ? "Edit description" : "Add description"}
        </Button>

        {description && (
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
            New events created will be visible to:
          </Typography>
          <ToggleButtonGroup
            value={visibility}
            exclusive
            onChange={(e, val) => val && setVisibility(val)}
            size="small"
          >
            <ToggleButton value="all">
              <PublicIcon fontSize="small" />
              All
            </ToggleButton>
            <ToggleButton value="you">
              <LockIcon fontSize="small" />
              You
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </DialogContent>

      <DialogActions>
        <Box mt={3} display="flex" justifyContent="flex-end" gap={1}>
          <Button
            variant="outlined"
            onClick={(e) => onClose({}, "backdropClick")}
          >
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            variant="contained"
            onClick={handleSave}
          >
            Create
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default CalendarPopover;
