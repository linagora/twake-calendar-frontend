import { useState } from "react";
import { createCalendar } from "./CalendarSlice";
import { useAppDispatch } from "../../app/hooks";
import {
  Popover,
  TextField,
  Button,
  Box,
  Typography,
  Select,
  ButtonGroup,
} from "@mui/material";

function CalendarPopover({
  anchorEl,
  open,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (Calendar: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  const dispatch = useAppDispatch();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const timezones = Intl.supportedValuesOf?.("timeZone") ?? [];
  const handleSave = () => {

    dispatch(createCalendar({ name, description, color }));
    onClose({}, "backdropClick");

    // Reset
    setName("");
    setDescription("");
  };
  const palette = [
    "#D50000",
    "#E67C73",
    "#F4511E",
    "#F6BF26",
    "#33B679",
    "#0B8043",
    "#039BE5",
    "#3F51B5",
    "#7986CB",
    "#8E24AA",
    "#616161",
  ];
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "center",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "center",
        horizontal: "center",
      }}
    >
      <Box p={2}>
        <Typography variant="h6" gutterBottom style={{backgroundColor:color}}>
          Create a Calendar
        </Typography>
        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          margin="dense"
        />
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
        <ButtonGroup>
          {palette.map((color) => (
            <Button
              style={{ backgroundColor: color }}
              onClick={() => setColor(color)}
            />
          ))}
        </ButtonGroup>
        <Select
          fullWidth
          label="timeZone"
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
        >
          {timezones.map((zone: string) => (
            <div>{zone}</div>
          ))}
        </Select>
        <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
          <Button
            variant="outlined"
            onClick={() => onClose({}, "backdropClick")}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </Box>
      </Box>
    </Popover>
  );
}

export default CalendarPopover;
