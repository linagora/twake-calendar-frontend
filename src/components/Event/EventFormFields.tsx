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
  onCalendarChange?: (newCalendarId: number) => void;

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
  const originalTimeRef = React.useRef<{ start: string; end: string } | null>(
    null
  );

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

  // Validation logic
  const validateForm = React.useCallback(() => {
    // Title validation
    const isTitleValid = title.trim().length > 0;
    const shouldShowTitleError = showValidationErrors && !isTitleValid;

    // Date/time validation
    let isDateTimeValid = true;
    let dateTimeError = "";
    let startError = "";

    // Convert to string if needed
    const startStr = typeof start === "string" ? start : String(start || "");
    const endStr = typeof end === "string" ? end : String(end || "");

    // Check if start date is provided and valid
    if (!start || startStr.trim() === "") {
      isDateTimeValid = false;
      dateTimeError = "Start date/time is required";
      startError = "Start date/time is required";
    } else if (isNaN(new Date(start).getTime())) {
      isDateTimeValid = false;
      dateTimeError = "Invalid start date/time";
      startError = "Invalid start date/time";
    }
    // Check if end date is provided and valid
    else if (!end || endStr.trim() === "") {
      isDateTimeValid = false;
      dateTimeError = "End date/time is required";
    } else if (isNaN(new Date(end).getTime())) {
      isDateTimeValid = false;
      dateTimeError = "Invalid end date/time";
    }
    // Check if end is after start
    else {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (endDate <= startDate) {
        isDateTimeValid = false;
        dateTimeError = "End time must be after start time";
      }
    }

    const isValid = isTitleValid && isDateTimeValid;

    return {
      isValid,
      errors: {
        title: shouldShowTitleError ? "Title is required" : "",
        start: showValidationErrors ? startError : "",
        dateTime: showValidationErrors ? dateTimeError : "",
      },
    };
  }, [title, start, end, showValidationErrors]);

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

  const handleStartChange = (newStart: string) => {
    if (onStartChange) {
      onStartChange(newStart);
    } else {
      setStart(newStart);
    }
  };

  const handleEndChange = (newEnd: string) => {
    if (onEndChange) {
      onEndChange(newEnd);
    } else {
      setEnd(newEnd);
    }
  };

  const handleAllDayChange = (
    newAllDay: boolean,
    newStart: string,
    newEnd: string
  ) => {
    setAllDay(newAllDay);
    onAllDayChange?.(newAllDay, newStart, newEnd);
  };

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
        <Box display="flex" gap={2} flexDirection="column">
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
                onChange={(e) => handleStartChange(e.target.value)}
                error={!!validation.errors.start}
                helperText={validation.errors.start}
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
                onChange={(e) => handleEndChange(e.target.value)}
                error={!!validation.errors.dateTime}
                helperText={validation.errors.dateTime}
                size="small"
                margin="dense"
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>
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
                    // OFF => ON: Save original time before converting to all-day
                    if (start.includes("T")) {
                      originalTimeRef.current = { start, end };
                    }

                    // Convert to date-only format only if both dates are valid
                    if (start && end) {
                      const startDate = start.includes("T")
                        ? new Date(start)
                        : new Date(start + "T00:00:00");
                      const endDate = end.includes("T")
                        ? new Date(end)
                        : new Date(end + "T00:00:00");

                      // Check if dates are valid before proceeding
                      if (
                        !isNaN(startDate.getTime()) &&
                        !isNaN(endDate.getTime())
                      ) {
                        // If same day, extend end to next day
                        if (endDate.getDate() === startDate.getDate()) {
                          endDate.setDate(startDate.getDate() + 1);
                        }

                        const formattedEnd = formatLocalDateTime(endDate);
                        if (formattedEnd) {
                          newEnd = formattedEnd;
                        }
                      }
                    }
                  } else {
                    // ON => OFF: Restore original time if available
                    if (originalTimeRef.current) {
                      // Extract hours/minutes from original time strings
                      const originalStartMatch =
                        originalTimeRef.current.start.match(/T(\d{2}):(\d{2})/);
                      const originalEndMatch =
                        originalTimeRef.current.end.match(/T(\d{2}):(\d{2})/);

                      if (originalStartMatch && originalEndMatch) {
                        // Parse current date (YYYY-MM-DD)
                        const currentDate = start.split("T")[0];

                        // Reconstruct datetime with original time
                        newStart = `${currentDate}T${originalStartMatch[1]}:${originalStartMatch[2]}`;
                        newEnd = `${currentDate}T${originalEndMatch[1]}:${originalEndMatch[2]}`;
                      }

                      // Clear stored time after use
                      originalTimeRef.current = null;
                    } else if (start) {
                      // No original time, use rounded current time
                      const startDate = start.includes("T")
                        ? new Date(start)
                        : new Date(start + "T00:00:00");

                      // Check if start date is valid
                      if (!isNaN(startDate.getTime())) {
                        const currentTime = getRoundedCurrentTime();

                        startDate.setHours(currentTime.getHours());
                        startDate.setMinutes(currentTime.getMinutes());
                        const formattedStart = formatLocalDateTime(startDate);
                        if (formattedStart) {
                          newStart = formattedStart;
                        }

                        const endDate = new Date(startDate);
                        endDate.setMinutes(endDate.getMinutes() + 30);
                        const formattedEnd = formatLocalDateTime(endDate);
                        if (formattedEnd) {
                          newEnd = formattedEnd;
                        }
                      }
                    }
                  }

                  // Only update local state if no callback (for backwards compatibility)
                  if (!onAllDayChange) {
                    setStart(newStart);
                    setEnd(newEnd);
                    setAllDay(newAllDay);
                  } else {
                    // Let callback handle all state updates to avoid duplicate renders
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
            value={calendarid.toString()}
            label={!showMore ? "Calendar" : ""}
            displayEmpty
            onChange={(e: SelectChangeEvent) =>
              handleCalendarChange(Number(e.target.value))
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
