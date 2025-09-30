import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AttendeeSelector from "../../components/Attendees/AttendeeSearch";
import { ResponsiveDialog } from "../../components/Dialog";
import { putEventAsync } from "../Calendars/CalendarSlice";
import { Calendars } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/userDataTypes";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { createSelector } from "@reduxjs/toolkit";
import RepeatEvent from "../../components/Event/EventRepeat";

// Helper component for field with label
const FieldWithLabel = React.memo(
  ({
    label,
    isExpanded,
    children,
  }: {
    label: string;
    isExpanded: boolean;
    children: React.ReactNode;
  }) => {
    if (!isExpanded) {
      // Normal mode: label on top
      return (
        <Box>
          <Typography
            component="label"
            sx={{
              display: "block",
              marginBottom: "4px",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {label}
          </Typography>
          {children}
        </Box>
      );
    }

    // Extended mode: label on left
    return (
      <Box display="flex" alignItems="center">
        <Typography
          component="label"
          sx={{
            minWidth: "115px",
            marginRight: "12px",
            flexShrink: 0,
          }}
        >
          {label}
        </Typography>
        <Box flexGrow={1}>{children}</Box>
      </Box>
    );
  }
);

FieldWithLabel.displayName = "FieldWithLabel";

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
  const [showMore, setShowMore] = useState(false);

  const [title, setTitle] = useState(event?.title ?? "");

  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [start, setStart] = useState(event?.start ? event.start : "");
  const [end, setEnd] = useState(event?.end ? event.end : "");
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

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (selectedRange) {
      setStart(selectedRange ? formatLocalDateTime(selectedRange.start) : "");
      setEnd(selectedRange ? formatLocalDateTime(selectedRange.end) : "");
    }
  }, [selectedRange]);

  useEffect(() => {
    setTitle(event?.title ?? "");
    setAttendees(
      event?.attendee
        ? event.attendee.filter((a) => a.cal_address !== organizer?.cal_address)
        : []
    );
  }, [event, organizer?.cal_address]);

  const handleClose = () => {
    onClose({}, "backdropClick");
    // Reset state
    setShowMore(false);
    setTitle("");
    setDescription("");
    setAttendees([]);
    setLocation("");
    setCalendarid(0);
  };

  const handleSave = async () => {
    const newEventUID = crypto.randomUUID();

    const newEvent: CalendarEvent = {
      calId: userPersonnalCalendars[calendarid].id,
      title,
      URL: `/calendars/${userPersonnalCalendars[calendarid].id}/${newEventUID}.ics`,
      start: new Date(start).toISOString(),
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
      newEvent.end = new Date(end).toISOString();
    }

    if (attendees.length > 0) {
      newEvent.attendee = newEvent.attendee.concat(attendees);
    }

    // Close popup immediately
    onClose({}, "backdropClick");

    // Reset state
    setShowMore(false);
    setTitle("");
    setDescription("");
    setAttendees([]);
    setLocation("");
    setCalendarid(0);

    // Save to API in background
    dispatch(
      putEventAsync({
        cal: userPersonnalCalendars[calendarid],
        newEvent,
      })
    );
  };

  const dialogActions = (
    <Box display="flex" justifyContent="space-between" width="100%" px={2}>
      {!showMore && (
        <Button onClick={() => setShowMore(!showMore)}>Show More</Button>
      )}
      <Box display="flex" gap={1} ml={showMore ? "auto" : 0}>
        <Button variant="outlined" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!title}>
          Save
        </Button>
      </Box>
    </Box>
  );

  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={event?.uid ? "Duplicate Event" : "Create Event"}
      isExpanded={showMore}
      onExpandToggle={() => setShowMore(!showMore)}
      actions={dialogActions}
    >
      <FieldWithLabel label="Title" isExpanded={showMore}>
        <TextField
          fullWidth
          label={!showMore ? "Title" : ""}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="small"
          margin="dense"
        />
      </FieldWithLabel>
      <FieldWithLabel label="Description" isExpanded={showMore}>
        <TextField
          fullWidth
          label={!showMore ? "Description" : ""}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="small"
          margin="dense"
          multiline
          rows={2}
        />
      </FieldWithLabel>
      <FieldWithLabel label="Calendar" isExpanded={showMore}>
        <FormControl fullWidth margin="dense" size="small">
          {!showMore && (
            <InputLabel id="calendar-select-label">Calendar</InputLabel>
          )}
          <Select
            labelId="calendar-select-label"
            value={calendarid.toString()}
            label={!showMore ? "Calendar" : ""}
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
      </FieldWithLabel>

      <FieldWithLabel label="Date & Time" isExpanded={showMore}>
        <Box display="flex" gap={2}>
          <Box flexGrow={1}>
            {showMore && (
              <Typography variant="caption" display="block" mb={0.5}>
                Start
              </Typography>
            )}
            <TextField
              fullWidth
              label={!showMore ? "Start" : ""}
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
          </Box>
          <Box flexGrow={1}>
            {showMore && (
              <Typography variant="caption" display="block" mb={0.5}>
                End
              </Typography>
            )}
            <TextField
              fullWidth
              label={!showMore ? "End" : ""}
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
          </Box>
        </Box>
      </FieldWithLabel>
      <FieldWithLabel label=" " isExpanded={showMore}>
        <Box>
          <FormControlLabel
            control={
              <Checkbox
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
            }
            label="All day"
            sx={{ padding: "0 8px 0 0" }}
          />
        </Box>
      </FieldWithLabel>
      <FieldWithLabel label="Attendees" isExpanded={showMore}>
        <AttendeeSelector attendees={attendees} setAttendees={setAttendees} />
      </FieldWithLabel>
      <FieldWithLabel label="Location" isExpanded={showMore}>
        <TextField
          fullWidth
          label={!showMore ? "Location" : ""}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          size="small"
          margin="dense"
        />
      </FieldWithLabel>
      {/* Extended options */}
      {showMore && (
        <>
          <FieldWithLabel label="Repeat" isExpanded={showMore}>
            <RepeatEvent
              repetition={repetition}
              eventStart={selectedRange?.start ?? new Date()}
              setRepetition={setRepetition}
            />
          </FieldWithLabel>
          <FieldWithLabel label="Alarm" isExpanded={showMore}>
            <FormControl fullWidth margin="dense" size="small">
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
          </FieldWithLabel>

          <FieldWithLabel label="Visibility" isExpanded={showMore}>
            <FormControl fullWidth margin="dense" size="small">
              <Select
                labelId="Visibility"
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
          </FieldWithLabel>
          <FieldWithLabel label="Show as" isExpanded={showMore}>
            <FormControl fullWidth margin="dense" size="small">
              <Select
                labelId="busy"
                value={busy}
                onChange={(e: SelectChangeEvent) => setBusy(e.target.value)}
              >
                <MenuItem value={"TRANSPARENT"}>Free</MenuItem>
                <MenuItem value={"OPAQUE"}>Busy </MenuItem>
              </Select>
            </FormControl>
          </FieldWithLabel>
        </>
      )}
    </ResponsiveDialog>
  );
}

export default EventPopover;

export function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
