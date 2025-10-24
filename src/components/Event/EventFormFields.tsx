import React from "react";
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
import AttendeeSelector from "../Attendees/AttendeeSearch";
import RepeatEvent from "./EventRepeat";
import { RepetitionObject } from "../../features/Events/EventsTypes";
import { userAttendee } from "../../features/User/userDataTypes";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import {
  generateMeetingLink,
  addVideoConferenceToDescription,
} from "../../utils/videoConferenceUtils";
import { TimezoneAutocomplete } from "../Timezone/TimezoneAutocomplete";
import { CalendarItemList } from "../Calendar/CalendarItemList";

// Helper to split datetime string (YYYY-MM-DDTHH:mm) to date and time
function splitDateTime(datetime: string): { date: string; time: string } {
  if (!datetime) return { date: "", time: "" };
  const parts = datetime.split("T");
  return {
    date: parts[0] || "",
    time: parts[1]?.slice(0, 5) || "", // HH:mm only
  };
}

// Helper to combine date and time to datetime string
function combineDateTime(date: string, time: string): string {
  if (!date) return "";
  if (!time) return date; // Date only for all-day
  return `${date}T${time}`;
}

// Helper component for field with label
export const FieldWithLabel = React.memo(
  ({
    label,
    isExpanded,
    children,
  }: {
    label: string | React.ReactNode;
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
  calendarid: string;
  setCalendarid: (calendarid: string) => void;
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
  isOpen?: boolean;

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
  onAllDayChange?: (
    newAllDay: boolean,
    newStart: string,
    newEnd: string
  ) => void;
  onCalendarChange?: (newCalendarId: string) => void;

  // Validation
  onValidationChange?: (isValid: boolean) => void;
  showValidationErrors?: boolean;
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
  isOpen = false,
  userPersonnalCalendars,
  timezoneList,
  onStartChange,
  onEndChange,
  onAllDayChange,
  onCalendarChange,
  onValidationChange,
  showValidationErrors = false,
}: EventFormFieldsProps) {
  // Store original time before toggling to all-day
  const originalTimeRef = React.useRef<{
    start: string;
    end: string;
    endDate?: string; // Add this field
    fromAllDaySlot?: boolean; // Track if came from all-day slot click
  } | null>(null);

  // Internal state for 4 separate fields
  const [startDate, setStartDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [endTime, setEndTime] = React.useState("");

  // Ref for title input field to enable auto-focus
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  // Track previous showMore state to detect changes
  const prevShowMoreRef = React.useRef<boolean | undefined>(undefined);

  // Auto-focus title field when modal opens (skip in test environment)
  React.useEffect(() => {
    if (isOpen) {
      if (titleInputRef.current && process.env.NODE_ENV !== "test") {
        // Use setTimeout to ensure the dialog is fully rendered
        const timer = setTimeout(() => {
          titleInputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  // Auto-focus title field when toggling between normal and extended mode
  React.useEffect(() => {
    // Skip on initial render (when prevShowMoreRef is undefined)
    if (
      prevShowMoreRef.current !== undefined &&
      isOpen &&
      process.env.NODE_ENV !== "test"
    ) {
      const hasChanged = prevShowMoreRef.current !== showMore;

      if (hasChanged) {
        // Simple setTimeout approach with sufficient delay for layout changes
        const timer = setTimeout(() => {
          if (titleInputRef.current) {
            titleInputRef.current.focus();
          }
        }, 150);

        // Update previous value before returning cleanup
        prevShowMoreRef.current = showMore;
        return () => clearTimeout(timer);
      }
    }

    // Always update previous value
    prevShowMoreRef.current = showMore;
  }, [showMore, isOpen]);

  // Sync start prop to startDate/startTime
  React.useEffect(() => {
    if (start) {
      const { date, time } = splitDateTime(start);
      setStartDate(date);
      setStartTime(time);
    }
  }, [start]);

  // Sync end prop to endDate/endTime
  React.useEffect(() => {
    if (end) {
      const { date, time } = splitDateTime(end);
      setEndDate(date);
      setEndTime(time);
    }
  }, [end]);

  // Sync allday prop changes to detect all-day slot clicks
  React.useEffect(() => {
    if (allday && (!startTime || !endTime)) {
      // This is likely from all-day slot click - set time fields empty
      setStartTime("");
      setEndTime("");

      // Mark this as coming from all-day slot for later uncheck logic
      originalTimeRef.current = {
        start: "",
        end: "",
        endDate: endDate,
        fromAllDaySlot: true,
      };
    }
  }, [allday, startTime, endTime, endDate]);

  // Change handlers for 4 separate fields
  const handleStartDateChange = React.useCallback(
    (newDate: string) => {
      setStartDate(newDate);
      const newStart = combineDateTime(newDate, startTime);
      if (onStartChange) {
        onStartChange(newStart);
      } else {
        setStart(newStart);
      }
    },
    [startTime, onStartChange, setStart]
  );

  const handleStartTimeChange = React.useCallback(
    (newTime: string) => {
      setStartTime(newTime);
      const newStart = combineDateTime(startDate, newTime);
      if (onStartChange) {
        onStartChange(newStart);
      } else {
        setStart(newStart);
      }
    },
    [startDate, onStartChange, setStart]
  );

  const handleEndDateChange = React.useCallback(
    (newDate: string) => {
      setEndDate(newDate);
      const newEnd = combineDateTime(newDate, endTime);
      if (onEndChange) {
        onEndChange(newEnd);
      } else {
        setEnd(newEnd);
      }
    },
    [endTime, onEndChange, setEnd]
  );

  const handleEndTimeChange = React.useCallback(
    (newTime: string) => {
      setEndTime(newTime);
      const newEnd = combineDateTime(endDate, newTime);
      if (onEndChange) {
        onEndChange(newEnd);
      } else {
        setEnd(newEnd);
      }
    },
    [endDate, onEndChange, setEnd]
  );

  // Validation logic
  const validateForm = React.useCallback(() => {
    const isTitleValid = title.trim().length > 0;
    const shouldShowTitleError = showValidationErrors && !isTitleValid;

    let isDateTimeValid = true;
    let dateTimeError = "";

    // Validate start date
    if (!startDate || startDate.trim() === "") {
      isDateTimeValid = false;
      dateTimeError = "Start date is required";
    }
    // Validate start time (if not all-day)
    else if (!allday && (!startTime || startTime.trim() === "")) {
      isDateTimeValid = false;
      dateTimeError = "Start time is required";
    }
    // Validate end date
    else if (!endDate || endDate.trim() === "") {
      isDateTimeValid = false;
      dateTimeError = "End date is required";
    }
    // Validate end time (if not all-day)
    else if (!allday && (!endTime || endTime.trim() === "")) {
      isDateTimeValid = false;
      dateTimeError = "End time is required";
    }
    // Validate end > start
    else {
      const startDateTime = allday
        ? new Date(startDate + "T00:00:00")
        : new Date(combineDateTime(startDate, startTime));
      const endDateTime = allday
        ? new Date(endDate + "T00:00:00")
        : new Date(combineDateTime(endDate, endTime));

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        isDateTimeValid = false;
        dateTimeError = "Invalid date/time";
      } else if (endDateTime <= startDateTime) {
        isDateTimeValid = false;
        dateTimeError = "End time must be after start time";
      }
    }

    const isValid = isTitleValid && isDateTimeValid;

    return {
      isValid,
      errors: {
        title: shouldShowTitleError ? "Title is required" : "",
        dateTime: showValidationErrors ? dateTimeError : "",
      },
    };
  }, [
    title,
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    showValidationErrors,
  ]);

  // Notify parent about validation changes
  React.useEffect(() => {
    const validation = validateForm();
    onValidationChange?.(validation.isValid);
  }, [validateForm, onValidationChange]);

  const validation = validateForm();

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

  const handleAllDayChange = (
    newAllDay: boolean,
    newStart: string,
    newEnd: string
  ) => {
    setAllDay(newAllDay);
    onAllDayChange?.(newAllDay, newStart, newEnd);
  };

  const handleCalendarChange = (newCalendarId: string) => {
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

  return (
    <>
      <FieldWithLabel
        label={
          <>
            Title <span style={{ color: "red" }}>*</span>
          </>
        }
        isExpanded={showMore}
      >
        <TextField
          fullWidth
          label={!showMore ? "Title" : ""}
          placeholder="Add title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          error={!!validation.errors.title}
          helperText={validation.errors.title}
          size="small"
          margin="dense"
          inputRef={titleInputRef}
        />
      </FieldWithLabel>

      {!showDescription && (
        <FieldWithLabel label=" " isExpanded={showMore}>
          <Box display="flex" gap={1} mb={1}>
            <Button
              startIcon={<DescriptionIcon />}
              onClick={() => setShowDescription(true)}
              size="small"
              sx={{
                textTransform: "none",
                color: "text.secondary",
              }}
            >
              Add description
            </Button>
          </Box>
        </FieldWithLabel>
      )}

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
            minRows={2}
            maxRows={10}
            sx={{
              "& .MuiInputBase-root": {
                maxHeight: "33%",
                overflowY: "auto",
              },
              "& textarea": {
                resize: "vertical",
              },
            }}
          />
        </FieldWithLabel>
      )}

      <FieldWithLabel label="Date & Time" isExpanded={showMore}>
        <Box display="flex" gap={1} flexDirection="column">
          {/* First row: 4 fields */}
          <Box
            display="flex"
            gap={1}
            flexDirection="row"
            alignItems="flex-start"
          >
            {/* Start Date - 30% */}
            <Box sx={{ flexGrow: 0.3, flexBasis: "30%" }}>
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

            {/* Start Time - 20% */}
            <Box sx={{ flexGrow: 0.2, flexBasis: "20%" }}>
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

            {/* End Time - 20% */}
            <Box sx={{ flexGrow: 0.2, flexBasis: "20%" }}>
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
                error={!!validation.errors.dateTime}
                size="small"
                margin="dense"
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {/* End Date - 30% */}
            <Box sx={{ flexGrow: 0.3, flexBasis: "30%" }}>
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
                error={!!validation.errors.dateTime}
                size="small"
                margin="dense"
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>

          {/* Second row: Error message - 2 columns 50% each */}
          {validation.errors.dateTime && (
            <Box display="flex" gap={1} flexDirection="row">
              {/* Empty left column - 50% */}
              <Box sx={{ flexGrow: 0.5, flexBasis: "50%" }} />

              {/* Error message right column - 50% */}
              <Box sx={{ flexGrow: 0.5, flexBasis: "50%" }}>
                <Typography variant="caption" color="error">
                  {validation.errors.dateTime}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </FieldWithLabel>

      <FieldWithLabel label=" " isExpanded={showMore}>
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={allday}
                onChange={() => {
                  const newAllDay = !allday;
                  let newStart = start;
                  let newEnd = end;

                  if (newAllDay) {
                    // OFF => ON: Save original time AND original end date
                    if (start.includes("T")) {
                      originalTimeRef.current = {
                        start: startTime,
                        end: endTime,
                        endDate: endDate, // Save original end date
                      };
                    }

                    // Reset time to empty, keep only date part
                    setStartTime("");
                    setEndTime("");
                    newStart = startDate;
                    newEnd = endDate;

                    // If same day, extend end to next day
                    if (startDate === endDate) {
                      const nextDay = new Date(endDate);
                      nextDay.setDate(nextDay.getDate() + 1);
                      newEnd = nextDay.toISOString().split("T")[0];
                      setEndDate(newEnd); // Update internal endDate state
                    }
                  } else {
                    // ON => OFF: Restore original time AND original end date
                    if (originalTimeRef.current) {
                      // Check if this came from all-day slot click
                      if (originalTimeRef.current.fromAllDaySlot) {
                        // From all-day slot: set endDate = startDate, use default time
                        const currentTime = getRoundedCurrentTime();
                        const hours = String(currentTime.getHours()).padStart(
                          2,
                          "0"
                        );
                        const minutes = String(
                          currentTime.getMinutes()
                        ).padStart(2, "0");
                        const timeStr = `${hours}:${minutes}`;

                        newStart = combineDateTime(startDate, timeStr);

                        // End time = start time + 1 hour
                        const endTimeDate = new Date(currentTime);
                        endTimeDate.setHours(endTimeDate.getHours() + 1);
                        const endHours = String(
                          endTimeDate.getHours()
                        ).padStart(2, "0");
                        const endMinutes = String(
                          endTimeDate.getMinutes()
                        ).padStart(2, "0");
                        const endTimeStr = `${endHours}:${endMinutes}`;

                        newEnd = combineDateTime(startDate, endTimeStr); // Use startDate as endDate

                        // Update internal states
                        setStartTime(timeStr);
                        setEndTime(endTimeStr);
                        setEndDate(startDate); // Set endDate = startDate
                      } else {
                        // Normal case: restore original time AND original end date
                        const restoredEndDate =
                          originalTimeRef.current.endDate || endDate;

                        newStart = combineDateTime(
                          startDate,
                          originalTimeRef.current.start
                        );
                        newEnd = combineDateTime(
                          restoredEndDate,
                          originalTimeRef.current.end
                        );

                        // Update internal states
                        setStartTime(originalTimeRef.current.start);
                        setEndTime(originalTimeRef.current.end);
                        setEndDate(restoredEndDate);
                      }

                      originalTimeRef.current = null;
                    } else {
                      // No original time: use rounded current time with 1 hour duration
                      const currentTime = getRoundedCurrentTime();
                      const hours = String(currentTime.getHours()).padStart(
                        2,
                        "0"
                      );
                      const minutes = String(currentTime.getMinutes()).padStart(
                        2,
                        "0"
                      );
                      const timeStr = `${hours}:${minutes}`;

                      newStart = combineDateTime(startDate, timeStr);

                      // End time = start time + 1 hour (not 30 mins)
                      const endTimeDate = new Date(currentTime);
                      endTimeDate.setHours(endTimeDate.getHours() + 1); // Changed from setMinutes +30
                      const endHours = String(endTimeDate.getHours()).padStart(
                        2,
                        "0"
                      );
                      const endMinutes = String(
                        endTimeDate.getMinutes()
                      ).padStart(2, "0");
                      const endTimeStr = `${endHours}:${endMinutes}`;

                      newEnd = combineDateTime(endDate, endTimeStr);

                      // Update internal states
                      setStartTime(timeStr);
                      setEndTime(endTimeStr);
                    }
                  }

                  if (!onAllDayChange) {
                    setStart(newStart);
                    setEnd(newEnd);
                    setAllDay(newAllDay);
                  } else {
                    handleAllDayChange(newAllDay, newStart, newEnd);
                  }
                }}
              />
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
          <TimezoneAutocomplete
            value={timezone}
            onChange={setTimezone}
            zones={timezoneList.zones}
            getTimezoneOffset={timezoneList.getTimezoneOffset}
            showIcon={true}
            width={240}
            size="small"
            placeholder="Select timezone"
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
            value={calendarid}
            label={!showMore ? "Calendar" : ""}
            displayEmpty
            onChange={(e: SelectChangeEvent) =>
              handleCalendarChange(e.target.value)
            }
          >
            {CalendarItemList(userPersonnalCalendars)}
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

export function formatLocalDateTime(date: Date, timeZone?: string): string {
  // Guard against invalid or undefined dates
  if (!date || isNaN(date.getTime())) {
    return "";
  }

  if (timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
    const formatted = formatter.format(date);
    return formatted.replace(", ", "T");
  }

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
