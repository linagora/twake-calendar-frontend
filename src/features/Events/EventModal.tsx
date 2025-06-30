import React, { useEffect, useState } from "react";
import { addEvent } from "./EventsSlice";
import { CalendarEvent } from "./EventsTypes";
import { DateSelectArg } from "@fullcalendar/core";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  Popover,
  TextField,
  Button,
  Box,
  Typography,
  Select,
  MenuItem,
} from "@mui/material";

function EventPopover({
  anchorEl,
  open,
  onClose,
  selectedRange,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
  selectedRange: any;
}) {
  const dispatch = useAppDispatch();

  const organizer = useAppSelector((state) => state.user.organiserData);
  const calendars = useAppSelector((state) => state.calendars);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [calendarid, setCalendarid] = useState("");

  useEffect(() => {
    if (selectedRange) {
      setStart(selectedRange.startStr);
      setEnd(selectedRange.endStr ?? "");
    }
  }, [selectedRange]);

  const handleSave = () => {
    const newEvent: CalendarEvent = {
      summary,
      start: new Date(start),
      end: new Date(end),
      uid: Date.now().toString(36),
      description,
      location,
      organizer,
      attendee: [
        {
          cn: organizer.cn,
          cal_address: organizer.cal_address,
          partstat: "ACCEPTED",
          rsvp: "FALSE",
          role: "CHAIR",
          cutype: "INDIVIDUAL",
        },
      ],
      transp: "OPAQUE",
    };
    dispatch(addEvent(newEvent));
    console.log(newEvent);
    onClose({}, "backdropClick");

    // Reset
    setSummary("");
    setDescription("");
    setLocation("");
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
    >
      <Box p={2} width={300}>
        <Typography variant="h6" gutterBottom>
          Create Event
        </Typography>
        <Select onClick={(e) => console.log(e.target)}>
          {Object.keys(calendars).map((calendar) => (
            <MenuItem value={calendar}>{calendars[calendar].name}</MenuItem>
          ))}
        </Select>
        <TextField
          fullWidth
          label="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          size="small"
          margin="dense"
        />
        <TextField
          fullWidth
          label="Start"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          size="small"
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="End"
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          size="small"
          margin="dense"
          InputLabelProps={{ shrink: true }}
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
        <TextField
          fullWidth
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          size="small"
          margin="dense"
        />
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

export default EventPopover;
