import { Calendar } from "@/features/Calendars/CalendarTypes";
import { RepetitionObject } from "@/features/Events/EventsTypes";
import { userAttendee } from "@/features/User/models/attendee";
import iconCamera from "@/static/images/icon-camera.svg";
import {
  addVideoConferenceToDescription,
  generateMeetingLink,
} from "@/utils/videoConferenceUtils";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  ToggleButton,
  Typography,
} from "@linagora/twake-mui";
import {
  Close as DeleteIcon,
  ContentCopy as CopyIcon,
  Public as PublicIcon,
} from "@mui/icons-material";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import React from "react";
import { useI18n } from "twake-i18n";
import AttendeeSelector from "../Attendees/AttendeeSearch";
import { CalendarItemList } from "../Calendar/CalendarItemList";
import { SnackbarAlert } from "../Loading/SnackBarAlert";
import { TimezoneAutocomplete } from "../Timezone/TimezoneAutocomplete";
import { AddDescButton } from "./AddDescButton";
import { DateTimeFields } from "./components/DateTimeFields";
import { FieldWithLabel } from "./components/FieldWithLabel";
import RepeatEvent from "./EventRepeat";
import { useAllDayToggle } from "./hooks/useAllDayToggle";
import { combineDateTime, splitDateTime } from "./utils/dateTimeHelpers";
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
  userPersonalCalendars: Calendar[];
  timezoneList: {
    zones: string[];
    browserTz: string;
    getTimezoneOffset: (tzName: string, date: Date) => string;
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
  onHasEndDateChangedChange?: (has: boolean) => void;
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
  userPersonalCalendars,
  timezoneList,
  onStartChange,
  onEndChange,
  onAllDayChange,
  onCalendarChange,
  onValidationChange,
  showValidationErrors = false,
  onHasEndDateChangedChange,
}: EventFormFieldsProps) {
  const { t } = useI18n();

  // Internal state for 4 separate fields
  const [startDate, setStartDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [endTime, setEndTime] = React.useState("");

  // Track if user has manually changed end date in extended mode
  const [hasEndDateChanged, setHasEndDateChanged] = React.useState(false);

  // Reset hasEndDateChanged when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setHasEndDateChanged(false);
    }
  }, [isOpen]);

  // Notify parent about end date change visibility state
  React.useEffect(() => {
    onHasEndDateChangedChange?.(hasEndDateChanged);
  }, [hasEndDateChanged, onHasEndDateChangedChange]);

  // Reset hasEndDateChanged when startDate === endDate in normal mode
  React.useEffect(() => {
    if (
      !showMore &&
      hasEndDateChanged &&
      startDate &&
      endDate &&
      startDate === endDate
    ) {
      setHasEndDateChanged(false);
    }
  }, [showMore, hasEndDateChanged, startDate, endDate]);

  // Use all-day toggle hook
  const { handleAllDayToggle } = useAllDayToggle({
    allday,
    start,
    end,
    startDate,
    startTime,
    endDate,
    endTime,
    setStartTime,
    setEndTime,
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

  // Change handlers for 4 separate fields
  const handleStartDateChange = React.useCallback(
    (newDate: string, newTime?: string) => {
      setStartDate(newDate);
      const newStart = combineDateTime(newDate, newTime ? newTime : startTime);

      if (onStartChange) {
        onStartChange(newStart);
      } else {
        setStart(newStart);
      }
    },
    [startTime, onStartChange, setStart]
  );

  const handleStartTimeChange = React.useCallback(
    (newTime: string, newDate?: string) => {
      setStartTime(newTime);
      const newStart = combineDateTime(newDate ? newDate : startDate, newTime);
      if (onStartChange) {
        onStartChange(newStart);
      } else {
        setStart(newStart);
      }
    },
    [startDate, onStartChange, setStart]
  );

  const handleEndDateChange = React.useCallback(
    (newDate: string, newTime?: string) => {
      setEndDate(newDate);
      // Track if user changed end date in extended mode
      if (showMore) {
        setHasEndDateChanged(true);
      }
      const newEnd = combineDateTime(newDate, newTime ? newTime : endTime);
      if (onEndChange) {
        onEndChange(newEnd);
      } else {
        setEnd(newEnd);
      }
    },
    [endTime, onEndChange, setEnd, showMore]
  );

  const handleEndTimeChange = React.useCallback(
    (newTime: string, newDate?: string) => {
      setEndTime(newTime);

      const newEnd = combineDateTime(newDate ? newDate : endDate, newTime);
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
      startDate,
      startTime,
      endDate,
      endTime,
      allday,
      showValidationErrors,
      hasEndDateChanged,
      showMore,
    });
  }, [
    title,
    startDate,
    startTime,
    endDate,
    endTime,
    allday,
    showValidationErrors,
    hasEndDateChanged,
    showMore,
  ]);

  // Notify parent about validation changes
  React.useEffect(() => {
    const validation = validateForm();
    onValidationChange?.(validation.isValid);
  }, [validateForm, onValidationChange]);

  // Auto-calculate end time from start time (+ 1 hour) if not already set
  React.useEffect(() => {
    if (startTime && !endTime && !allday) {
      const [hours, minutes] = startTime.split(":");
      const endHour = (parseInt(hours) + 1) % 24;
      const calculatedEndTime = `${endHour.toString().padStart(2, "0")}:${minutes}`;
      setEndTime(calculatedEndTime);
      const newEnd = combineDateTime(endDate || startDate, calculatedEndTime);
      if (onEndChange) {
        onEndChange(newEnd);
      } else {
        setEnd(newEnd);
      }
    }
  }, [startTime, endTime, allday, endDate, startDate, onEndChange, setEnd]);

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

  const [openToast, setOpenToast] = React.useState(false);

  const handleCopyMeetingLink = async () => {
    if (meetingLink) {
      try {
        await navigator.clipboard.writeText(meetingLink);
        setOpenToast(true);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  const handleDeleteVideoConference = () => {
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
      <FieldWithLabel label={t("event.form.title")} isExpanded={showMore}>
        <TextField
          fullWidth
          label=""
          inputProps={{ "aria-label": t("event.form.title") }}
          placeholder={t("event.form.titlePlaceholder")}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          size="small"
          margin="dense"
          inputRef={titleInputRef}
        />
      </FieldWithLabel>

      <AddDescButton
        showDescription={showDescription}
        setShowDescription={setShowDescription}
        showMore={showMore}
        description={description}
        setDescription={setDescription}
        buttonVariant="contained"
        buttonColor="secondary"
      />

      <FieldWithLabel label={t("event.form.dateTime")} isExpanded={showMore}>
        <DateTimeFields
          startDate={startDate}
          startTime={startTime}
          endDate={endDate}
          endTime={endTime}
          allday={allday}
          showMore={showMore}
          hasEndDateChanged={hasEndDateChanged}
          validation={validation}
          onStartDateChange={handleStartDateChange}
          onStartTimeChange={handleStartTimeChange}
          onEndDateChange={handleEndDateChange}
          onEndTimeChange={handleEndTimeChange}
          showEndDate={
            showMore ||
            allday ||
            (hasEndDateChanged && startDate !== endDate) ||
            (!showMore && !allday && startDate !== endDate)
          }
          onToggleEndDate={() => {}}
        />
      </FieldWithLabel>

      <FieldWithLabel label=" " isExpanded={showMore}>
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Checkbox checked={allday} onChange={handleAllDayToggle} />
            }
            label={
              <Typography variant="h6">{t("event.form.allDay")}</Typography>
            }
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
            label={
              <Typography variant="h6">{t("event.form.repeat")}</Typography>
            }
          />
          <TimezoneAutocomplete
            value={timezone}
            onChange={setTimezone}
            zones={timezoneList.zones}
            getTimezoneOffset={(tzName: string) =>
              timezoneList.getTimezoneOffset(tzName, new Date(start))
            }
            showIcon={false}
            width={240}
            size="small"
            placeholder={t("event.form.timezonePlaceholder")}
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

      <FieldWithLabel
        label={t("event.form.participants")}
        isExpanded={showMore}
      >
        <AttendeeSelector
          attendees={attendees}
          setAttendees={setAttendees}
          inputSlot={(params) => <TextField {...params} size="small" />}
        />
      </FieldWithLabel>

      <FieldWithLabel
        label={t("event.form.videoMeeting")}
        isExpanded={showMore}
      >
        <Box display="flex" gap={1} alignItems="center">
          <Button
            startIcon={
              <img src={iconCamera} alt="camera" width={24} height={24} />
            }
            onClick={handleAddVideoConference}
            size="medium"
            variant="contained"
            color="secondary"
            sx={{
              borderRadius: "4px",
              display: hasVideoConference ? "none" : "flex",
            }}
          >
            {t("event.form.addVisioConference")}
          </Button>

          {hasVideoConference && meetingLink && (
            <>
              <Button
                startIcon={
                  <img src={iconCamera} alt="camera" width={24} height={24} />
                }
                onClick={() => window.open(meetingLink, "_blank")}
                size="medium"
                variant="contained"
                color="primary"
                sx={{
                  borderRadius: "4px",
                  mr: 1,
                }}
              >
                {t("event.form.joinVisioConference")}
              </Button>
              <IconButton
                onClick={handleCopyMeetingLink}
                size="small"
                sx={{ color: "primary.main" }}
                aria-label={t("event.form.copyMeetingLink")}
                title={t("event.form.copyMeetingLink")}
              >
                <CopyIcon />
              </IconButton>
              <IconButton
                onClick={handleDeleteVideoConference}
                size="small"
                sx={{ color: "error.main" }}
                aria-label={t("event.form.removeVideoConference")}
                title={t("event.form.removeVideoConference")}
              >
                <DeleteIcon />
              </IconButton>
            </>
          )}
        </Box>
      </FieldWithLabel>

      <FieldWithLabel label={t("event.form.location")} isExpanded={showMore}>
        <TextField
          fullWidth
          label=""
          inputProps={{ "aria-label": t("event.form.location") }}
          placeholder={t("event.form.locationPlaceholder")}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          size="small"
          margin="dense"
        />
      </FieldWithLabel>

      <FieldWithLabel label={t("event.form.calendar")} isExpanded={showMore}>
        <FormControl fullWidth margin="dense" size="small">
          <Select
            value={calendarid ?? ""}
            label=""
            SelectDisplayProps={{ "aria-label": t("event.form.calendar") }}
            displayEmpty
            onChange={(e: SelectChangeEvent) =>
              handleCalendarChange(e.target.value)
            }
          >
            {CalendarItemList(userPersonalCalendars)}
          </Select>
        </FormControl>
      </FieldWithLabel>

      {showMore && (
        <>
          <FieldWithLabel
            label={t("event.form.notification")}
            isExpanded={showMore}
          >
            <FormControl fullWidth margin="dense" size="small">
              <Select
                labelId="notification"
                value={alarm}
                displayEmpty
                onChange={(e: SelectChangeEvent) => setAlarm(e.target.value)}
              >
                <MenuItem value="">{t("event.form.notifications.")}</MenuItem>
                <MenuItem value="-PT1M">
                  {t("event.form.notifications.-PT1M")}
                </MenuItem>
                <MenuItem value="-PT5M">
                  {t("event.form.notifications.-PT5M")}
                </MenuItem>
                <MenuItem value="-PT10M">
                  {t("event.form.notifications.-PT10M")}
                </MenuItem>
                <MenuItem value="-PT15M">
                  {t("event.form.notifications.-PT15M")}
                </MenuItem>
                <MenuItem value="-PT30M">
                  {t("event.form.notifications.-PT30M")}
                </MenuItem>
                <MenuItem value="-PT1H">
                  {t("event.form.notifications.-PT1H")}
                </MenuItem>
                <MenuItem value="-PT2H">
                  {t("event.form.notifications.-PT2H")}
                </MenuItem>
                <MenuItem value="-PT5H">
                  {t("event.form.notifications.-PT5H")}
                </MenuItem>
                <MenuItem value="-PT12H">
                  {t("event.form.notifications.-PT12H")}
                </MenuItem>
                <MenuItem value="-PT1D">
                  {t("event.form.notifications.-PT1D")}
                </MenuItem>
                <MenuItem value="-PT2D">
                  {t("event.form.notifications.-PT2D")}
                </MenuItem>
                <MenuItem value="-PT1W">
                  {t("event.form.notifications.-PT1W")}
                </MenuItem>
              </Select>
            </FormControl>
          </FieldWithLabel>

          <FieldWithLabel
            label={t("event.form.showMeAs")}
            isExpanded={showMore}
          >
            <FormControl fullWidth margin="dense" size="small">
              <Select
                labelId="busy"
                value={busy}
                onChange={(e: SelectChangeEvent) => setBusy(e.target.value)}
              >
                <MenuItem value={"TRANSPARENT"}>
                  {t("event.form.free")}
                </MenuItem>
                <MenuItem value={"OPAQUE"}>{t("event.form.busy")}</MenuItem>
              </Select>
            </FormControl>
          </FieldWithLabel>

          <FieldWithLabel
            label={t("event.form.visibleTo")}
            isExpanded={showMore}
          >
            <ToggleButtonGroup
              value={eventClass}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) {
                  setEventClass(newValue);
                }
              }}
              size="medium"
            >
              <ToggleButton value="PUBLIC" sx={{ minWidth: "160px" }}>
                <PublicIcon sx={{ mr: 1 }} />
                {t("event.form.visibleAll")}
              </ToggleButton>
              <ToggleButton value="PRIVATE" sx={{ minWidth: "160px" }}>
                <LockOutlineIcon sx={{ mr: 1 }} />
                {t("event.form.visibleParticipants")}
              </ToggleButton>
            </ToggleButtonGroup>
          </FieldWithLabel>
        </>
      )}
      <SnackbarAlert
        setOpen={setOpenToast}
        open={openToast}
        message={t("event.form.meetCopied")}
      />
    </>
  );
}
