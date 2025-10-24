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
import { FieldWithLabel } from "./components/FieldWithLabel";
import { DateTimeFields } from "./components/DateTimeFields";
import { useAllDayToggle } from "./hooks/useAllDayToggle";
import { splitDateTime, combineDateTime } from "./utils/dateTimeHelpers";
import {
  formatLocalDateTime,
  formatDateTimeInTimezone,
  getRoundedCurrentTime,
} from "./utils/dateTimeFormatters";
import { validateEventForm } from "./utils/formValidation";

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
  // Internal state for 4 separate fields
  const [startDate, setStartDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [endTime, setEndTime] = React.useState("");

  // Use all-day toggle hook
  const { originalTimeRef, handleAllDayToggle } = useAllDayToggle({
    allday,
    start,
    end,
    startDate,
    startTime,
    endDate,
    endTime,
    setStartTime,
    setEndTime,
    setEndDate,
    setStart,
    setEnd,
    setAllDay,
    onAllDayChange,
  });

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
    return validateEventForm({
      title,
      startDate,
      startTime,
      endDate,
      endTime,
      allday,
      showValidationErrors,
    });
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

  const handleCalendarChange = (newCalendarId: string) => {
    setCalendarid(newCalendarId);
    onCalendarChange?.(newCalendarId);
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
        <DateTimeFields
          startDate={startDate}
          startTime={startTime}
          endDate={endDate}
          endTime={endTime}
          allday={allday}
          showMore={showMore}
          validation={validation}
          onStartDateChange={handleStartDateChange}
          onStartTimeChange={handleStartTimeChange}
          onEndDateChange={handleEndDateChange}
          onEndTimeChange={handleEndTimeChange}
        />
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
