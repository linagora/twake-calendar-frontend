import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  Description as DescriptionIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  CameraAlt as VideocamIcon,
  ContentCopy as CopyIcon,
  Close as DeleteIcon,
} from "@mui/icons-material";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AttendeeSelector from "../../components/Attendees/AttendeeSearch";
import { ResponsiveDialog } from "../../components/Dialog";
import { putEventAsync } from "../Calendars/CalendarSlice";
import { Calendars } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/userDataTypes";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { createSelector } from "@reduxjs/toolkit";
import RepeatEvent from "../../components/Event/EventRepeat";
import { TIMEZONES } from "../../utils/timezone-data";
import {
  generateMeetingLink,
  addVideoConferenceToDescription,
} from "../../utils/videoConferenceUtils";

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

  // Helper function to resolve timezone aliases
  const resolveTimezone = (tzName: string): string => {
    if (TIMEZONES.zones[tzName]) {
      return tzName;
    }
    if (TIMEZONES.aliases[tzName]) {
      return TIMEZONES.aliases[tzName].aliasTo;
    }
    return tzName;
  };

  const timezoneList = useMemo(() => {
    const zones = Object.keys(TIMEZONES.zones).sort();
    const browserTz = resolveTimezone(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    const getTimezoneOffset = (tzName: string): string => {
      const resolvedTz = resolveTimezone(tzName);
      const tzData = TIMEZONES.zones[resolvedTz];
      if (!tzData) return "";

      const icsMatch = tzData.ics.match(/TZOFFSETTO:([+-]\d{4})/);
      if (!icsMatch) return "";

      const offset = icsMatch[1];
      const hours = parseInt(offset.slice(0, 3));
      const minutes = parseInt(offset.slice(3));

      if (minutes === 0) {
        return `UTC${hours >= 0 ? "+" : ""}${hours}`;
      }
      return `UTC${hours >= 0 ? "+" : ""}${hours}:${Math.abs(minutes).toString().padStart(2, "0")}`;
    };

    return { zones, browserTz, getTimezoneOffset };
  }, []);

  const [showMore, setShowMore] = useState(false);
  const [showDescription, setShowDescription] = useState(
    event?.description ? true : false
  );
  const [showRepeat, setShowRepeat] = useState(
    event?.repetition?.freq ? true : false
  );

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
  const [important, setImportant] = useState(false);
  const [timezone, setTimezone] = useState(
    event?.timezone ? resolveTimezone(event.timezone) : timezoneList.browserTz
  );
  const [hasVideoConference, setHasVideoConference] = useState(
    event?.x_openpass_videoconference ? true : false
  );
  const [meetingLink, setMeetingLink] = useState<string | null>(
    event?.x_openpass_videoconference || null
  );

  // Use ref to track if we've already initialized to avoid infinite loop
  const isInitializedRef = useRef(false);
  const userPersonnalCalendarsRef = useRef(userPersonnalCalendars);

  // Update ref when userPersonnalCalendars changes
  useEffect(() => {
    userPersonnalCalendarsRef.current = userPersonnalCalendars;
  }, [userPersonnalCalendars]);

  const resetAllStateToDefault = useCallback(() => {
    setShowMore(false);
    setShowDescription(false);
    setShowRepeat(false);
    setTitle("");
    setDescription("");
    setAttendees([]);
    setLocation("");
    setStart("");
    setEnd("");
    setCalendarid(0);
    setAllDay(false);
    setRepetition({} as RepetitionObject);
    setAlarm("");
    setEventClass("PUBLIC");
    setBusy("OPAQUE");
    setImportant(false);
    setTimezone(timezoneList.browserTz);
    setHasVideoConference(false);
    setMeetingLink(null);
  }, [timezoneList.browserTz]);

  useEffect(() => {
    if (selectedRange) {
      setStart(selectedRange ? formatLocalDateTime(selectedRange.start) : "");
      setEnd(selectedRange ? formatLocalDateTime(selectedRange.end) : "");
    }
  }, [selectedRange]);

  // Initialize state when event prop changes
  useEffect(() => {
    if (event) {
      // Editing existing event - populate fields with event data
      setTitle(event.title ?? "");
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setStart(event.start ? event.start : "");
      setEnd(event.end ? event.end : "");
      setCalendarid(
        event.calId
          ? userPersonnalCalendarsRef.current.findIndex(
              (e) => e.id === event.calId
            )
          : 0
      );
      setAllDay(event.allday ?? false);
      setRepetition(event.repetition ?? ({} as RepetitionObject));
      setShowRepeat(event.repetition?.freq ? true : false);
      setAttendees(
        event.attendee
          ? event.attendee.filter(
              (a) => a.cal_address !== organizer?.cal_address
            )
          : []
      );
      setAlarm(event.alarm?.trigger ?? "");
      setEventClass(event.class ?? "PUBLIC");
      setBusy(event.transp ?? "OPAQUE");
      setTimezone(
        event.timezone
          ? resolveTimezone(event.timezone)
          : timezoneList.browserTz
      );
      setHasVideoConference(event.x_openpass_videoconference ? true : false);
      setMeetingLink(event.x_openpass_videoconference || null);

      // Update description to include video conference footer if exists
      if (event.x_openpass_videoconference && event.description) {
        const hasVideoFooter = event.description.includes("Visio:");
        if (!hasVideoFooter) {
          setDescription(
            addVideoConferenceToDescription(
              event.description,
              event.x_openpass_videoconference
            )
          );
        } else {
          setDescription(event.description);
        }
      }
    }
  }, [event, organizer?.cal_address, timezoneList.browserTz]);

  // Reset state when creating new event (event is undefined)
  useEffect(() => {
    if (!event && isInitializedRef.current) {
      // Creating new event - reset all fields to default
      setShowMore(false);
      setShowDescription(false);
      setShowRepeat(false);
      setTitle("");
      setDescription("");
      setAttendees([]);
      setLocation("");
      setStart("");
      setEnd("");
      setCalendarid(0);
      setAllDay(false);
      setRepetition({} as RepetitionObject);
      setAlarm("");
      setEventClass("PUBLIC");
      setBusy("OPAQUE");
      setImportant(false);
      setTimezone(timezoneList.browserTz);
      setHasVideoConference(false);
      setMeetingLink(null);
    }
    isInitializedRef.current = true;
  }, [event, timezoneList.browserTz]);

  const handleAddVideoConference = () => {
    const newMeetingLink = generateMeetingLink();
    const updatedDescription = addVideoConferenceToDescription(
      description,
      newMeetingLink
    );
    setDescription(updatedDescription);
    setHasVideoConference(true);
    setMeetingLink(newMeetingLink);
  };

  const handleCopyMeetingLink = async () => {
    if (meetingLink) {
      try {
        await navigator.clipboard.writeText(meetingLink);
        // You could add a toast notification here
        console.log("Meeting link copied to clipboard");
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  const handleDeleteVideoConference = () => {
    // Remove video conference footer from description
    const updatedDescription = description.replace(
      /\nVisio: https?:\/\/[^\s]+/,
      ""
    );
    setDescription(updatedDescription);
    setHasVideoConference(false);
    setMeetingLink(null);
  };

  const handleClose = () => {
    onClose({}, "backdropClick");
    resetAllStateToDefault();
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
      x_openpass_videoconference: meetingLink || undefined,
    };
    if (end) {
      newEvent.end = new Date(end).toISOString();
    }

    if (attendees.length > 0) {
      newEvent.attendee = newEvent.attendee.concat(attendees);
    }

    // Close popup immediately
    onClose({}, "backdropClick");

    // Reset all state to default values
    resetAllStateToDefault();

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
          placeholder="Add title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="small"
          margin="dense"
        />
      </FieldWithLabel>

      <FieldWithLabel label=" " isExpanded={showMore}>
        <Box display="flex" gap={1} mb={1}>
          <Button
            startIcon={<DescriptionIcon />}
            onClick={() => setShowDescription(true)}
            size="small"
            sx={{
              textTransform: "none",
              color: "text.secondary",
              display: showDescription ? "none" : "flex",
            }}
          >
            Add description
          </Button>
        </Box>
      </FieldWithLabel>

      {showDescription && (
        <FieldWithLabel label="Description" isExpanded={showMore}>
          <TextField
            fullWidth
            label={!showMore ? "Description" : ""}
            placeholder="Add description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            margin="dense"
            multiline
            rows={2}
          />
        </FieldWithLabel>
      )}

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
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={important}
                onChange={() => setImportant(!important)}
              />
            }
            label="Mark as important"
          />
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
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={showRepeat}
                onChange={() => {
                  const newShowRepeat = !showRepeat;
                  setShowRepeat(newShowRepeat);
                  if (newShowRepeat) {
                    setRepetition({
                      freq: "daily",
                      interval: 1,
                      occurrences: 0,
                      endDate: "",
                      selectedDays: [],
                    } as RepetitionObject);
                  } else {
                    setRepetition({
                      freq: "",
                      interval: 1,
                      occurrences: 0,
                      endDate: "",
                      selectedDays: [],
                    } as RepetitionObject);
                  }
                }}
              />
            }
            label="Repeat"
          />
          <FormControl size="small" sx={{ width: 160 }}>
            <Select
              value={timezone}
              onChange={(e: SelectChangeEvent) => setTimezone(e.target.value)}
              displayEmpty
            >
              {timezoneList.zones.map((tz) => (
                <MenuItem key={tz} value={tz}>
                  ({timezoneList.getTimezoneOffset(tz)}) {tz.replace(/_/g, " ")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </FieldWithLabel>

      {showRepeat && (
        <FieldWithLabel label=" " isExpanded={showMore}>
          <RepeatEvent
            repetition={repetition}
            eventStart={selectedRange?.start ?? new Date()}
            setRepetition={setRepetition}
          />
        </FieldWithLabel>
      )}

      <FieldWithLabel label="Participants" isExpanded={showMore}>
        <AttendeeSelector attendees={attendees} setAttendees={setAttendees} />
      </FieldWithLabel>

      <FieldWithLabel label="Video meeting" isExpanded={showMore}>
        <Box display="flex" gap={1} alignItems="center">
          <Button
            startIcon={<VideocamIcon />}
            onClick={handleAddVideoConference}
            size="medium"
            sx={{
              textTransform: "none",
              color: "text.secondary",
              display: hasVideoConference ? "none" : "flex",
            }}
          >
            Add Visio conference
          </Button>

          {hasVideoConference && meetingLink && (
            <>
              <Button
                startIcon={<VideocamIcon />}
                onClick={() => window.open(meetingLink, "_blank")}
                size="medium"
                variant="contained"
                sx={{
                  textTransform: "none",
                  mr: 1,
                }}
              >
                Join Visio conference
              </Button>
              <IconButton
                onClick={handleCopyMeetingLink}
                size="small"
                sx={{ color: "primary.main" }}
                aria-label="Copy meeting link"
                title="Copy meeting link"
              >
                <CopyIcon />
              </IconButton>
              <IconButton
                onClick={handleDeleteVideoConference}
                size="small"
                sx={{ color: "error.main" }}
                aria-label="Remove video conference"
                title="Remove video conference"
              >
                <DeleteIcon />
              </IconButton>
            </>
          )}
        </Box>
      </FieldWithLabel>
      <FieldWithLabel label="Location" isExpanded={showMore}>
        <TextField
          fullWidth
          label={!showMore ? "Location" : ""}
          placeholder="Add location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          size="small"
          margin="dense"
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
            displayEmpty
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

      {/* Extended options */}
      {showMore && (
        <>
          <FieldWithLabel label="Notification" isExpanded={showMore}>
            <FormControl fullWidth margin="dense" size="small">
              <Select
                labelId="notification"
                value={alarm}
                onChange={(e: SelectChangeEvent) => setAlarm(e.target.value)}
              >
                <MenuItem value={""}>No Notification</MenuItem>
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

          <FieldWithLabel label="Show me as" isExpanded={showMore}>
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

          <FieldWithLabel label="Visible to" isExpanded={showMore}>
            <ToggleButtonGroup
              value={eventClass}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) {
                  setEventClass(newValue);
                }
              }}
              size="small"
            >
              <ToggleButton value="PUBLIC" sx={{ width: "140px" }}>
                <PublicIcon sx={{ mr: 1, fontSize: "16px" }} />
                All
              </ToggleButton>
              <ToggleButton value="PRIVATE" sx={{ width: "140px" }}>
                <LockIcon sx={{ mr: 1, fontSize: "16px" }} />
                Participants
              </ToggleButton>
            </ToggleButtonGroup>
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
