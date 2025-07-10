import React, { ChangeEvent, useEffect, useState } from "react";
import { addEvent } from "../Calendars/CalendarSlice";
import { CalendarEvent } from "./EventsTypes";
import { DateSelectArg } from "@fullcalendar/core";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import Dialog, {
  DialogActions,
  DialogContent,
  DialogTitle,
} from "cozy-ui/transpiled/react/Dialog";
import ToggleButtonGroup from "cozy-ui/transpiled/react/ToggleButtonGroup";
import ToggleButton from "cozy-ui/transpiled/react/ToggleButton";
import TextField from "cozy-ui/transpiled/react/TextField";
import { Button } from "cozy-ui/transpiled/react";
import MenuItem from "cozy-ui/transpiled/react/MenuItem";
import { Calendars } from "../Calendars/CalendarTypes";

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
  const calendars = useAppSelector((state) => state.calendars.list);
  const userId = useAppSelector((state) => state.user.userData.openpaasId);
  const userPersonnalCalendars: Record<string, Calendars> = useAppSelector(
    (state) => {
      const calendars: Record<string, Calendars> = {};
      Object.keys(state.calendars.list).map((id) => {
        if (id.split("/")[0] === userId) {
          calendars[id] = state.calendars.list[id];
        }
      });
      return calendars;
    }
  );

  const [title, setTitle] = useState("");
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
      title,
      start: new Date(start ?? ""),
      end: new Date(end ?? ""),
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
      color: calendars[calendarid].color,
    };
    dispatch(addEvent({ calendarUid: calendarid, event: newEvent }));
    onClose({}, "backdropClick");

    // Reset
    setTitle("");
    setDescription("");
    setLocation("");
  };

  return (
    <Dialog
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
      <DialogTitle> Create Event</DialogTitle>
      <DialogContent>
        <TextField
          select
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setCalendarid(e.target.value)
          }
        >
          {Object.keys(userPersonnalCalendars).map((calendar) => (
            <MenuItem value={calendar}>
              {userPersonnalCalendars[calendar].name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          label="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onClose({}, "backdropClick")}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EventPopover;
