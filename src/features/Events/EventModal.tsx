import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AttendeeSelector from "../../components/Attendees/AttendeeSearch";
import { TIMEZONES } from "../../utils/timezone-data";
import { putEventAsync } from "../Calendars/CalendarSlice";
import { Calendars } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/userDataTypes";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { createSelector } from "@reduxjs/toolkit";
import RepeatEvent from "../../components/Event/EventRepeat";

function EventPopover({
  anchorEl,
  open,
  onClose,
  selectedRange,
  setSelectedRange,
  calendarRef,
  event,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
  selectedRange: DateSelectArg | null;
  setSelectedRange: Function;
  calendarRef: React.RefObject<CalendarApi | null>;
  event?: CalendarEvent;
}) {
  const dispatch = useAppDispatch();

  const organizer = useAppSelector((state) => state.user.organiserData);
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const selectPersonnalCalendars = createSelector(
    (state) => state.calendars,
    (calendars) =>
      Object.keys(calendars.list)
        .map((id) => {
          if (id.split("/")[0] === userId) {
            return calendars.list[id];
          }
          return {} as Calendars;
        })
        .filter((calendar) => calendar.id)
  );
  const userPersonnalCalendars: Calendars[] = useAppSelector(
    selectPersonnalCalendars
  );
  const timezones = TIMEZONES.aliases;
  const [showMore, setShowMore] = useState(false);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [start, setStart] = useState(
    event?.start ? new Date(event.start).toISOString() : ""
  );
  const [end, setEnd] = useState(
    event?.end ? new Date(event.end)?.toISOString() : ""
  );
  const [calendarid, setCalendarid] = useState(
    event?.calId
      ? userPersonnalCalendars.findIndex((e) => e.id === event?.calId)
      : 0
  );
  const [allday, setAllDay] = useState(event?.allday ?? false);
  const [repetition, setRepetition] = useState<RepetitionObject>(
    event?.repetition ?? ({} as RepetitionObject)
  );
  const [attendees, setAttendees] = useState<userAttendee[]>(
    event?.attendee
      ? event.attendee.filter((a) => a.cal_address !== organizer.cal_address)
      : []
  );
  const [alarm, setAlarm] = useState(event?.alarm?.trigger ?? "");
  const [eventClass, setEventClass] = useState(event?.class ?? "PUBLIC");
  const [busy, setBusy] = useState(event?.transp ?? "OPAQUE");

  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  useEffect(() => {
    if (selectedRange) {
      setStart(selectedRange ? formatLocalDateTime(selectedRange.start) : "");
      setEnd(selectedRange ? formatLocalDateTime(selectedRange.end) : "");
    }
  }, [selectedRange]);

  const handleSave = async () => {
    const newEventUID = crypto.randomUUID();

    const newEvent: CalendarEvent = {
      calId: userPersonnalCalendars[calendarid].id,
      title,
      URL: `/calendars/${userPersonnalCalendars[calendarid].id}/${newEventUID}.ics`,
      start: new Date(start),
      allday,
      uid: newEventUID,
      description,
      location,
      class: eventClass,
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
      transp: busy,
      color: userPersonnalCalendars[calendarid]?.color,
      alarm: { trigger: alarm, action: "EMAIL" },
    };
    if (end) {
      newEvent.end = new Date(end);
    }

    if (attendees.length > 0) {
      newEvent.attendee = newEvent.attendee.concat(attendees);
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
      anchorOrigin={{
        vertical: "center",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "center",
        horizontal: "center",
      }}
    >
      <Card>
        <CardHeader title={event ? "Duplicate Event" : "Create Event"} />
        <CardContent
          sx={{ maxHeight: "85vh", maxWidth: "40vw", overflow: "auto" }}
        >
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
              {Object.keys(userPersonnalCalendars).map((calendar, index) => (
                <MenuItem key={index} value={index}>
                  {userPersonnalCalendars[index].name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Start"
            type={allday ? "date" : "datetime-local"}
            value={allday ? start.split("T")[0] : start}
            onChange={(e) => {
              const newStart = e.target.value;
              setStart(newStart);
              const newRange = {
                ...selectedRange,
                start: new Date(newStart),
                startStr: newStart,
                allDay: allday,
              };
              setSelectedRange(newRange);
              calendarRef.current?.select(newRange);
            }}
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="End"
            type={allday ? "date" : "datetime-local"}
            value={allday ? end.split("T")[0] : end}
            onChange={(e) => {
              const newEnd = e.target.value;
              setEnd(newEnd);
              const newRange = {
                ...selectedRange,
                end: new Date(newEnd),
                endStr: newEnd,
                allDay: allday,
              };
              setSelectedRange(newRange);
              calendarRef.current?.select(newRange);
            }}
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <label>
            <input
              type="checkbox"
              checked={allday}
              onChange={() => {
                const endDate = new Date(end);
                const startDate = new Date(start);
                setAllDay(!allday);
                if (endDate.getDate() === startDate.getDate()) {
                  endDate.setDate(startDate.getDate() + 1);
                  setEnd(formatLocalDateTime(endDate));
                }

                const newRange = {
                  ...selectedRange,
                  startStr: allday ? start.split("T")[0] : start,
                  endStr: allday
                    ? endDate.toISOString().split("T")[0]
                    : endDate.toISOString(),
                  start: new Date(allday ? start.split("T")[0] : start),
                  end: new Date(
                    allday
                      ? endDate.toISOString().split("T")[0]
                      : endDate.toISOString()
                  ),
                  allDay: allday,
                };
                setSelectedRange(newRange);
              }}
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
          <AttendeeSelector attendees={attendees} setAttendees={setAttendees} />
          {/* Extended options */}
          {showMore && (
            <>
              <RepeatEvent
                repetition={repetition}
                eventStart={selectedRange?.start ?? new Date()}
                setRepetition={setRepetition}
              />
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="alarm">Alarm</InputLabel>
                <Select
                  labelId="alarm"
                  value={alarm}
                  onChange={(e: SelectChangeEvent) => setAlarm(e.target.value)}
                >
                  <MenuItem value={""}>No Alarm</MenuItem>
                  <MenuItem value={"-PT1M"}>1 minute</MenuItem>
                  <MenuItem value={"-PT5M"}>2 minutes</MenuItem>
                  <MenuItem value={"-PT10M"}>10 minutes</MenuItem>
                  <MenuItem value={"-PT15M"}>15 minutes</MenuItem>
                  <MenuItem value={"-PT30M"}>30 minutes</MenuItem>
                  <MenuItem value={"-PT1H"}>1 hours</MenuItem>
                  <MenuItem value={"-PT2H"}>2 hours</MenuItem>
                  <MenuItem value={"-PT5H"}>5 hours</MenuItem>
                  <MenuItem value={"-PT12H"}>12 hours</MenuItem>
                  <MenuItem value={"-PT1D"}>1 day</MenuItem>
                  <MenuItem value={"-PT2D"}>2 days</MenuItem>
                  <MenuItem value={"-PT1W"}>1 week</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="Visibility">Visibility</InputLabel>
                <Select
                  labelId="Visibility"
                  label="Visibility"
                  value={eventClass}
                  onChange={(e: SelectChangeEvent) =>
                    setEventClass(e.target.value)
                  }
                >
                  <MenuItem value={"PUBLIC"}>Public</MenuItem>
                  <MenuItem value={"CONFIDENTIAL"}>Show time only</MenuItem>
                  <MenuItem value={"PRIVATE"}>Private</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel id="busy">is Busy</InputLabel>
                <Select
                  labelId="busy"
                  value={busy}
                  label="is busy"
                  onChange={(e: SelectChangeEvent) => setBusy(e.target.value)}
                >
                  <MenuItem value={"TRANSPARENT"}>Free</MenuItem>
                  <MenuItem value={"OPAQUE"}>Busy </MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </CardContent>

        <CardActions>
          <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
            <Button
              variant="outlined"
              onClick={() => onClose({}, "backdropClick")}
            >
              Cancel
            </Button>
            <Button size="small" onClick={() => setShowMore(!showMore)}>
              {showMore ? "Show Less" : "Show More"}
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={!title}>
              Save
            </Button>
          </Box>
        </CardActions>
      </Card>
    </Popover>
  );
}

export default EventPopover;

export function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
