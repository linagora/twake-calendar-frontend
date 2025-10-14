import React, { useState, useEffect, useCallback } from "react";
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
import Autocomplete from "@mui/material/Autocomplete";
import {
  Description as DescriptionIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  CameraAlt as VideocamIcon,
  ContentCopy as CopyIcon,
  Close as DeleteIcon,
} from "@mui/icons-material";
import AttendeeSelector from "../Attendees/AttendeeSearch";
import RepeatEvent from "./EventRepeat";
import { RepetitionObject } from "../../features/Events/EventsTypes";
import { userAttendee } from "../../features/User/userDataTypes";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import {
  generateMeetingLink,
  addVideoConferenceToDescription,
} from "../../utils/videoConferenceUtils";

// Helper component for field with label
export const FieldWithLabel = React.memo(
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

// Helper functions for datetime manipulation
const splitDatetime = (datetime: string): { date: string; time: string } => {
  if (!datetime) return { date: "", time: "" };
  const [date, time] = datetime.split("T");
  return { date: date || "", time: time?.substring(0, 5) || "" };
};

const combineDatetime = (date: string, time: string): string => {
  if (!date) return "";
  return time ? `${date}T${time}` : `${date}T00:00`;
};

const calculateDuration = (start: string, end: string): number => {
  if (!start || !end) return 0;
  return new Date(end).getTime() - new Date(start).getTime();
};

const addDuration = (datetime: string, durationMs: number): string => {
  if (!datetime || durationMs === 0) return datetime;
  const newDate = new Date(new Date(datetime).getTime() + durationMs);
  return formatLocalDateTime(newDate);
};

interface EventFormFieldsProps {
  // Form state
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  location: string;
  setLocation: (location: string) => void;
  start: string;
  setStart: (start: string) => void;
  end: string;
  setEnd: (end: string) => void;
  allday: boolean;
  setAllDay: (allday: boolean) => void;
  repetition: RepetitionObject;
  setRepetition: (repetition: RepetitionObject) => void;
  typeOfAction?: "solo" | "all";
  attendees: userAttendee[];
  setAttendees: (attendees: userAttendee[]) => void;
  alarm: string;
  setAlarm: (alarm: string) => void;
  busy: string;
  setBusy: (busy: string) => void;
  eventClass: string;
  setEventClass: (eventClass: string) => void;
  timezone: string;
  setTimezone: (timezone: string) => void;
  calendarid: number;
  setCalendarid: (calendarid: number) => void;
  hasVideoConference: boolean;
  setHasVideoConference: (hasVideoConference: boolean) => void;
  meetingLink: string | null;
  setMeetingLink: (meetingLink: string | null) => void;

  // UI state
  showMore: boolean;
  showDescription: boolean;
  setShowDescription: (showDescription: boolean) => void;
  showRepeat: boolean;
  setShowRepeat: (showRepeat: boolean) => void;

  // Data
  userPersonnalCalendars: Calendars[];
  timezoneList: {
    zones: string[];
    browserTz: string;
    getTimezoneOffset: (tzName: string) => string;
  };

  // Event handlers
  onStartChange?: (newStart: string) => void;
  onEndChange?: (newEnd: string) => void;
  onAllDayChange?: (newAllDay: boolean) => void;
  onCalendarChange?: (newCalendarId: number) => void;
  onValidationChange?: (hasError: boolean) => void;
}

export default function EventFormFields({
  title,
  setTitle,
  description,
  setDescription,
  location,
  setLocation,
  start,
  setStart,
  end,
  setEnd,
  allday,
  setAllDay,
  repetition,
  setRepetition,
  typeOfAction,
  attendees,
  setAttendees,
  alarm,
  setAlarm,
  busy,
  setBusy,
  eventClass,
  setEventClass,
  timezone,
  setTimezone,
  calendarid,
  setCalendarid,
  hasVideoConference,
  setHasVideoConference,
  meetingLink,
  setMeetingLink,
  showMore,
  showDescription,
  setShowDescription,
  showRepeat,
  setShowRepeat,
  userPersonnalCalendars,
  timezoneList,
  onStartChange,
  onEndChange,
  onAllDayChange,
  onCalendarChange,
  onValidationChange,
}: EventFormFieldsProps) {
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

  const handleStartChange = useCallback(
    (newStart: string) => {
      setStart(newStart);
      onStartChange?.(newStart);
    },
    [setStart, onStartChange]
  );

  const handleEndChange = useCallback(
    (newEnd: string) => {
      setEnd(newEnd);
      onEndChange?.(newEnd);
    },
    [setEnd, onEndChange]
  );

  const handleAllDayChange = useCallback(
    (newAllDay: boolean) => {
      setAllDay(newAllDay);
      onAllDayChange?.(newAllDay);
    },
    [setAllDay, onAllDayChange]
  );

  const handleCalendarChange = (newCalendarId: number) => {
    setCalendarid(newCalendarId);
    onCalendarChange?.(newCalendarId);
  };

  const getRoundedCurrentTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 0 : 30;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
  };

  // Internal state for 4 separate fields
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  // Saved time values when toggling all-day
  const [savedStartTime, setSavedStartTime] = useState("");
  const [savedEndTime, setSavedEndTime] = useState("");

  // Validation error state
  const [dateTimeError, setDateTimeError] = useState("");

  // Initialize separate fields from props
  useEffect(() => {
    const startParts = splitDatetime(start);
    const endParts = splitDatetime(end);

    setStartDate(startParts.date);
    setStartTime(startParts.time);
    setEndDate(endParts.date);
    setEndTime(endParts.time);
  }, [start, end]);

  // Validate datetime whenever start or end changes
  useEffect(() => {
    if (!startDate || !endDate) {
      setDateTimeError("");
      return;
    }

    // For all-day events, only check dates
    if (allday) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (endDateObj < startDateObj) {
        setDateTimeError("End date must be after start date");
      } else {
        setDateTimeError("");
      }
      return;
    }

    // For timed events, check full datetime
    if (!startTime || !endTime) {
      setDateTimeError("");
      return;
    }

    const startDateTime = new Date(combineDatetime(startDate, startTime));
    const endDateTime = new Date(combineDatetime(endDate, endTime));

    if (endDateTime <= startDateTime) {
      setDateTimeError("End time must be after start time");
    } else {
      setDateTimeError("");
    }
  }, [startDate, startTime, endDate, endTime, allday]);

  // Notify parent component about validation state
  useEffect(() => {
    onValidationChange?.(!!dateTimeError);
  }, [dateTimeError, onValidationChange]);

  // Handle start date change with duration maintenance
  const handleStartDateChange = useCallback(
    (newStartDate: string) => {
      if (!newStartDate) return;

      const oldStart = combineDatetime(startDate, startTime);
      const oldEnd = combineDatetime(endDate, endTime);
      const duration = calculateDuration(oldStart, oldEnd);

      setStartDate(newStartDate);

      // Auto-adjust end date to maintain duration
      if (duration > 0) {
        const newStart = combineDatetime(newStartDate, startTime);
        const newEnd = addDuration(newStart, duration);
        const newEndParts = splitDatetime(newEnd);
        setEndDate(newEndParts.date);
        setEndTime(newEndParts.time);

        handleStartChange(newStart);
        handleEndChange(newEnd);
      } else {
        const newStart = combineDatetime(newStartDate, startTime);
        handleStartChange(newStart);
      }
    },
    [startDate, startTime, endDate, endTime, handleStartChange, handleEndChange]
  );

  // Handle start time change with duration maintenance
  const handleStartTimeChange = useCallback(
    (newStartTime: string) => {
      if (!newStartTime || !startDate) return;

      const oldStart = combineDatetime(startDate, startTime);
      const oldEnd = combineDatetime(endDate, endTime);
      const duration = calculateDuration(oldStart, oldEnd);

      setStartTime(newStartTime);

      // Auto-adjust end time to maintain duration
      if (duration > 0) {
        const newStart = combineDatetime(startDate, newStartTime);
        const newEnd = addDuration(newStart, duration);
        const newEndParts = splitDatetime(newEnd);
        setEndDate(newEndParts.date);
        setEndTime(newEndParts.time);

        handleStartChange(newStart);
        handleEndChange(newEnd);
      } else {
        const newStart = combineDatetime(startDate, newStartTime);
        handleStartChange(newStart);
      }
    },
    [startDate, startTime, endDate, endTime, handleStartChange, handleEndChange]
  );

  // Handle end date change (no auto-adjustment)
  const handleEndDateChange = useCallback(
    (newEndDate: string) => {
      if (!newEndDate) return;

      setEndDate(newEndDate);
      const newEnd = combineDatetime(newEndDate, endTime);
      handleEndChange(newEnd);
    },
    [endTime, handleEndChange]
  );

  // Handle end time change (no auto-adjustment)
  const handleEndTimeChange = useCallback(
    (newEndTime: string) => {
      if (!newEndTime || !endDate) return;

      setEndTime(newEndTime);
      const newEnd = combineDatetime(endDate, newEndTime);
      handleEndChange(newEnd);
    },
    [endDate, handleEndChange]
  );

  // Handle all-day toggle with time preservation
  const handleAllDayToggle = useCallback(() => {
    const newAllDay = !allday;

    if (newAllDay) {
      // Enable all-day: save current times and clear
      if (startTime) setSavedStartTime(startTime);
      if (endTime) setSavedEndTime(endTime);

      // Clear time values in UI
      setStartTime("");
      setEndTime("");

      // Adjust end date if needed (same day -> next day)
      if (endDate === startDate) {
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const newEndDate = nextDay.toISOString().split("T")[0];
        setEndDate(newEndDate);
        setEnd(newEndDate);
      } else {
        setEnd(endDate);
      }
      setStart(startDate);
    } else {
      // Disable all-day: restore saved times or use defaults
      let newStartTime = savedStartTime;
      let newEndTime = savedEndTime;

      if (!newStartTime) {
        // No saved time, use rounded current time
        const currentTime = getRoundedCurrentTime();
        newStartTime = `${currentTime.getHours().toString().padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}`;
        const endTimeDate = new Date(currentTime);
        endTimeDate.setMinutes(endTimeDate.getMinutes() + 30);
        newEndTime = `${endTimeDate.getHours().toString().padStart(2, "0")}:${endTimeDate.getMinutes().toString().padStart(2, "0")}`;
      }

      setStartTime(newStartTime);
      setEndTime(newEndTime);

      // Set end date = start date (event should be within same day)
      setEndDate(startDate);

      const newStart = combineDatetime(startDate, newStartTime);
      const newEnd = combineDatetime(startDate, newEndTime);

      setStart(newStart);
      setEnd(newEnd);
      handleStartChange(newStart);
      handleEndChange(newEnd);
    }

    handleAllDayChange(newAllDay);
  }, [
    allday,
    startDate,
    startTime,
    endDate,
    endTime,
    savedStartTime,
    savedEndTime,
    setStart,
    setEnd,
    handleStartChange,
    handleEndChange,
    handleAllDayChange,
  ]);

  return (
    <>
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
        <Box display="flex" gap={1}>
          {/* Start Date */}
          <Box flex="1 1 30%">
            {showMore && (
              <Typography variant="caption" display="block" mb={0.5}>
                Start Date
              </Typography>
            )}
            <TextField
              fullWidth
              label={!showMore ? "Start Date" : ""}
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              size="small"
              margin="dense"
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Start Time */}
          <Box flex="1 1 20%">
            {showMore && (
              <Typography variant="caption" display="block" mb={0.5}>
                Start Time
              </Typography>
            )}
            <TextField
              fullWidth
              label={!showMore ? "Start Time" : ""}
              type="time"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              disabled={allday}
              size="small"
              margin="dense"
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* End Time */}
          <Box flex="1 1 20%">
            {showMore && (
              <Typography variant="caption" display="block" mb={0.5}>
                End Time
              </Typography>
            )}
            <TextField
              fullWidth
              label={!showMore ? "End Time" : ""}
              type="time"
              value={endTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              disabled={allday}
              size="small"
              margin="dense"
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: endDate === startDate ? startTime : undefined,
              }}
              error={!!dateTimeError}
            />
          </Box>

          {/* End Date */}
          <Box flex="1 1 30%">
            {showMore && (
              <Typography variant="caption" display="block" mb={0.5}>
                End Date
              </Typography>
            )}
            <TextField
              fullWidth
              label={!showMore ? "End Date" : ""}
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              size="small"
              margin="dense"
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: startDate,
              }}
              error={!!dateTimeError}
            />
          </Box>
        </Box>
        {dateTimeError && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: "block", mt: 0.5 }}
          >
            {dateTimeError}
          </Typography>
        )}
      </FieldWithLabel>

      <FieldWithLabel label=" " isExpanded={showMore}>
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Checkbox checked={allday} onChange={handleAllDayToggle} />
            }
            label="All day"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={
                  showRepeat || (typeOfAction === "solo" && !!repetition?.freq)
                }
                disabled={typeOfAction === "solo"}
                onChange={() => {
                  const newShowRepeat = !showRepeat;
                  setShowRepeat(newShowRepeat);
                  if (newShowRepeat) {
                    setRepetition({
                      freq: "daily",
                      interval: 1,
                      occurrences: 0,
                      endDate: "",
                      byday: null,
                    } as RepetitionObject);
                  } else {
                    setRepetition({
                      freq: "",
                      interval: 1,
                      occurrences: 0,
                      endDate: "",
                      byday: null,
                    } as RepetitionObject);
                  }
                }}
              />
            }
            label="Repeat"
          />
          <Autocomplete
            sx={{ width: 250 }}
            value={timezone}
            onChange={(event, newValue) => {
              setTimezone(newValue || timezoneList.browserTz);
            }}
            options={timezoneList.zones}
            getOptionLabel={(option) =>
              `(${timezoneList.getTimezoneOffset(option)}) ${option.replace(/_/g, " ")}`
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Select timezone"
                size="small"
              />
            )}
            disableClearable
          />
        </Box>
      </FieldWithLabel>

      {(showRepeat || (typeOfAction === "solo" && repetition?.freq)) && (
        <FieldWithLabel label=" " isExpanded={showMore}>
          <RepeatEvent
            repetition={repetition}
            eventStart={new Date(start)}
            setRepetition={setRepetition}
            isOwn={typeOfAction !== "solo"}
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
              handleCalendarChange(Number(e.target.value))
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
    </>
  );
}

export function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTimeInTimezone(
  isoString: string,
  timezone: string
): string {
  // Parse the ISO string as UTC
  const utcDate = new Date(isoString);

  // Format the date in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const getValue = (type: string) =>
    parts.find((p) => p.type === type)?.value || "";

  return `${getValue("year")}-${getValue("month")}-${getValue("day")}T${getValue("hour")}:${getValue("minute")}`;
}
