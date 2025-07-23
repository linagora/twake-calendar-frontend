import React, { useEffect, useState } from "react";
import { addEvent, putEventAsync } from "../Calendars/CalendarSlice";
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
  SelectChangeEvent,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Calendars } from "../Calendars/CalendarTypes";
import { putEvent } from "./EventApi";
import { TIMEZONES } from "../../utils/timezone-data";
import { CheckBox, Repeat } from "@mui/icons-material";

function EventPopover({
  anchorEl,
  open,
  onClose,
  selectedRange,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
  selectedRange: DateSelectArg | null;
}) {
  const dispatch = useAppDispatch();

  const organizer = useAppSelector((state) => state.user.organiserData);
  const userId = useAppSelector((state) => state.user.userData.openpaasId);
  const userPersonnalCalendars: Calendars[] = useAppSelector((state) =>
    Object.keys(state.calendars.list).map((id) => {
      if (id.split("/")[0] === userId) {
        return state.calendars.list[id];
      }
      return {} as Calendars;
    })
  ).filter((calendar) => calendar.id);
  const timezones = TIMEZONES.aliases;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [calendarid, setCalendarid] = useState(0);
  const [allday, setAllDay] = useState(false);
  const [repetition, setRepetition] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  useEffect(() => {
    if (selectedRange) {
      setStart(selectedRange ? formatLocalDateTime(selectedRange.start) : "");
    }
  }, [selectedRange]);

  const handleSave = async () => {
    const newEvent: CalendarEvent = {
      title,
      start: new Date(start),
      allday,
      uid: crypto.randomUUID(),
      description,
      location,
      repetition,
      organizer,
      timezone,
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
      color: userPersonnalCalendars[calendarid]?.color,
    };
    if (end) {
      newEvent.end = new Date(end);
    }
    dispatch(
      putEventAsync({
        cal: userPersonnalCalendars[calendarid],
        newEvent,
      })
    );
    onClose({}, "backdropClick");

    // Reset
    setTitle("");
    setDescription("");
    setLocation("");
    setCalendarid(0);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
    >
      <Box p={2} width={500}>
        <Typography variant="h6" gutterBottom>
          Create Event
        </Typography>

        <TextField
          fullWidth
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="small"
          margin="dense"
        />
        <FormControl fullWidth margin="dense" size="small">
          <InputLabel id="calendar-select-label">Calendar</InputLabel>
          <Select
            labelId="calendar-select-label"
            value={calendarid.toString()}
            label="Calendar"
            onChange={(e: SelectChangeEvent) =>
              setCalendarid(Number(e.target.value))
            }
          >
            {Object.keys(userPersonnalCalendars).map((value, calendar) => (
              <MenuItem key={calendar} value={calendar}>
                {userPersonnalCalendars[calendar].name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Start"
          type={allday ? "date" : "datetime-local"}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          size="small"
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="End"
          type={allday ? "date" : "datetime-local"}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          size="small"
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
        <label>
          <input
            type="checkbox"
            checked={allday}
            onChange={() => setAllDay(!allday)}
          />
          All day
        </label>
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

        <FormControl fullWidth margin="dense" size="small">
          <InputLabel id="repeat">Repetition</InputLabel>
          <Select
            labelId="repeat"
            value={repetition}
            label="Time Zone"
            onChange={(e: SelectChangeEvent) => setRepetition(e.target.value)}
          >
            <MenuItem value={""}>No Repetition</MenuItem>
            <MenuItem value={"daily"}>Repeat daily</MenuItem>
            <MenuItem value={"weekly"}>Repeat weekly</MenuItem>
            <MenuItem value={"monthly"}>Repeat monthly</MenuItem>
            <MenuItem value={"yearly"}>Repeat yearly</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth margin="dense" size="small">
          <InputLabel id="timezone-select-label">Time Zone</InputLabel>
          <Select
            labelId="timezone-select-label"
            value={timezone}
            label="Time Zone"
            onChange={(e: SelectChangeEvent) => setTimezone(e.target.value)}
          >
            {Object.keys(timezones).map((key) => (
              <MenuItem key={key} value={timezones[key].aliasTo}>
                {key}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
          <Button
            variant="outlined"
            onClick={() => onClose({}, "backdropClick")}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!title}>
            Save
          </Button>
        </Box>
      </Box>
    </Popover>
  );
}

export default EventPopover;

function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
