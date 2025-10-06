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
import {
  userAttendee,
  RepetitionObject,
} from "../../features/Events/EventsTypes";
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
  important: boolean;
  setImportant: (important: boolean) => void;
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
  important,
  setImportant,
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

  const handleStartChange = (newStart: string) => {
    setStart(newStart);
    onStartChange?.(newStart);
  };

  const handleEndChange = (newEnd: string) => {
    setEnd(newEnd);
    onEndChange?.(newEnd);
  };

  const handleAllDayChange = (newAllDay: boolean) => {
    setAllDay(newAllDay);
    onAllDayChange?.(newAllDay);
  };

  const handleCalendarChange = (newCalendarId: number) => {
    setCalendarid(newCalendarId);
    onCalendarChange?.(newCalendarId);
  };

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
                  const newAllDay = !allday;
                  setAllDay(newAllDay);
                  if (endDate.getDate() === startDate.getDate()) {
                    endDate.setDate(startDate.getDate() + 1);
                    setEnd(formatLocalDateTime(endDate));
                  }
                  handleAllDayChange(newAllDay);
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
            eventStart={new Date(start)}
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
