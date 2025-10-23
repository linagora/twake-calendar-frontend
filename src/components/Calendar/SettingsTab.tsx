import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import {
  Box,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useAppSelector } from "../../app/hooks";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { ColorPicker } from "./CalendarColorPicker";

export function SettingsTab({
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
  color: Record<string, string>;
  setColor: Function;
  visibility: "public" | "private";
  setVisibility: Function;
  calendar?: Calendars;
}) {
  const [toggleDesc, setToggleDesc] = useState(Boolean(description));
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const isOwn = calendar ? calendar.id.split("/")[0] === userId : true;

  return (
    <Box mt={2}>
      <TextField
        fullWidth
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        margin="dense"
      />

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

      <Box mt={2}>
        <Typography variant="body2" gutterBottom>
          Color
        </Typography>
        <ColorPicker
          onChange={(color) => setColor(color)}
          selectedColor={color}
        />
      </Box>

      {isOwn && (
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
            <ToggleButton value="public">
              <PublicIcon fontSize="small" />
              All
            </ToggleButton>

            <ToggleButton value="private">
              <LockIcon fontSize="small" />
              You
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
    </Box>
  );
}
