import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import { Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { ResponsiveDialog } from "../../components/Dialog";
import { putEventAsync } from "../Calendars/CalendarSlice";
import { Calendars } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/userDataTypes";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { createSelector } from "@reduxjs/toolkit";
import { TIMEZONES } from "../../utils/timezone-data";
import { addVideoConferenceToDescription } from "../../utils/videoConferenceUtils";
import {
  getTimezoneOffset,
  resolveTimezone,
} from "../../components/Calendar/TimezoneSelector";
import { getCalendarRange } from "../../utils/dateUtils";
import { updateTempCalendar } from "../../components/Calendar/utils/calendarUtils";
import EventFormFields from "../../components/Event/EventFormFields";
import {
  formatLocalDateTime,
  formatDateTimeInTimezone,
} from "../../components/Event/utils/dateTimeFormatters";
import { convertFormDateTimeToISO } from "../../components/Event/utils/dateTimeHelpers";
import { addDays } from "../../components/Event/utils/dateRules";
import { useI18n } from "twake-i18n";
import {
  saveEventFormDataToTemp,
  restoreEventFormDataFromTemp as restoreEventFormDataFromStorage,
  clearEventFormTempData,
  showErrorNotification,
  buildEventFormTempData,
  restoreFormDataFromTemp,
  EventFormState,
} from "../../utils/eventFormTempStorage";
import { browserDefaultTimeZone } from "../../utils/timezone";

function EventPopover({
  open,
  onClose,
  selectedRange,
  setSelectedRange,
  calendarRef,
  event,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (refresh?: boolean) => void;
  selectedRange: DateSelectArg | null;
  setSelectedRange: Function;
  calendarRef: React.RefObject<CalendarApi | null>;
  event?: CalendarEvent;
}) {
  const dispatch = useAppDispatch();
  const { t, lang } = useI18n();

  const organizer = useAppSelector((state) => state.user.organiserData);
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const tempList = useAppSelector((state) => state.calendars.templist);
  const calList = useAppSelector((state) => state.calendars.list);
  const selectPersonalCalendars = createSelector(
    (state: any) => state.calendars,
    (calendars: any) =>
      Object.keys(calendars.list || {})
        .map((id) => {
          if (id.split("/")[0] === userId) {
            return calendars.list?.[id];
          }
          return {} as Calendars;
        })
        .filter((calendar) => calendar.id)
  );
  const userPersonalCalendars: Calendars[] = useAppSelector(
    selectPersonalCalendars
  );

  const timezoneList = useMemo(() => {
    const zones = Object.keys(TIMEZONES.zones).sort();
    const browserTz = resolveTimezone(browserDefaultTimeZone);

    return { zones, browserTz, getTimezoneOffset };
  }, []);

  const calendarTimezone = useAppSelector((state) => state.settings.timeZone);
  const resolvedCalendarTimezone = useMemo(() => {
    const tz = calendarTimezone || browserDefaultTimeZone;
    return resolveTimezone(tz);
  }, [calendarTimezone]);

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
  const defaultCalendarId = useMemo(
    () => userPersonalCalendars[0]?.id ?? "",
    [userPersonalCalendars]
  );

  const [calendarid, setCalendarid] = useState(
    event?.calId ?? defaultCalendarId
  );
  const [allday, setAllDay] = useState(event?.allday ?? false);
  const [repetition, setRepetition] = useState<RepetitionObject>(
    event?.repetition ?? ({} as RepetitionObject)
  );
  const [attendees, setAttendees] = useState<userAttendee[]>(
    event?.attendee
      ? event.attendee.filter((a) => a.cal_address !== organizer?.cal_address)
      : []
  );
  const [alarm, setAlarm] = useState(event?.alarm?.trigger ?? "");
  const [eventClass, setEventClass] = useState(event?.class ?? "PUBLIC");
  const [busy, setBusy] = useState(event?.transp ?? "OPAQUE");
  const [timezone, setTimezone] = useState(
    event?.timezone ? resolveTimezone(event.timezone) : resolvedCalendarTimezone
  );
  const [hasVideoConference, setHasVideoConference] = useState(
    event?.x_openpass_videoconference ? true : false
  );
  const [meetingLink, setMeetingLink] = useState<string | null>(
    event?.x_openpass_videoconference || null
  );
  const [isFormValid, setIsFormValid] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [hasEndDateChanged, setHasEndDateChanged] = useState(false);

  // Use ref to track if we've already initialized to avoid infinite loop
  const isInitializedRef = useRef(false);
  const userPersonalCalendarsRef = useRef(userPersonalCalendars);
  // Track when restoring from error to prevent other useEffects from overriding restored data
  const isRestoringFromErrorRef = useRef(false);

  // Update ref when userPersonalCalendars changes
  useEffect(() => {
    userPersonalCalendarsRef.current = userPersonalCalendars;
  }, [userPersonalCalendars]);

  useEffect(() => {
    if (!calendarid && defaultCalendarId) {
      setCalendarid(defaultCalendarId);
    }
  }, [calendarid, defaultCalendarId]);

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
    if (defaultCalendarId) {
      setCalendarid(defaultCalendarId);
    }
    setAllDay(false);
    setRepetition({} as RepetitionObject);
    setAlarm("");
    setEventClass("PUBLIC");
    setBusy("OPAQUE");
    setTimezone(resolvedCalendarTimezone);
    setHasVideoConference(false);
    setMeetingLink(null);
  }, [resolvedCalendarTimezone, defaultCalendarId]);

  // Track if we should sync from selectedRange (only on initial selection, not on toggle)
  const shouldSyncFromRangeRef = useRef(true);
  const prevOpenRef = useRef(false);

  // Sync timezone when modal opens or calendarTimezone changes
  useEffect(() => {
    // Detect modal opening (transition from closed to open)
    const isOpening = open && !prevOpenRef.current;

    if (isOpening) {
      shouldSyncFromRangeRef.current = true;
      setShowValidationErrors(false);

      // Set timezone to calendar timezone for new events when opening
      const isNewEvent = !event || !event.uid;
      if (isNewEvent) {
        setTimezone(resolvedCalendarTimezone);
      }
    }

    // Update previous open state
    prevOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.uid, resolvedCalendarTimezone]);

  // Separately sync timezone when calendarTimezone changes while modal is open for new events
  useEffect(() => {
    if (open && (!event || !event.uid)) {
      setTimezone(resolvedCalendarTimezone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedCalendarTimezone, open, event?.uid]);

  // Set start/end times when modal opens for new event creation
  useEffect(() => {
    // Skip if restoring from error - data already restored
    if (isRestoringFromErrorRef.current) {
      return;
    }
    // Only run when modal opens and not duplicating an event
    // Check if event has uid to determine if it's a valid event (not empty object)
    if (!shouldSyncFromRangeRef.current || !open || (event && event.uid)) {
      return;
    }

    if (selectedRange && selectedRange.start && selectedRange.end) {
      // Auto-check allday if selectedRange is all-day
      if (selectedRange.allDay) {
        setAllDay(true);
      }

      // selectedRange gives us the visual time displayed on calendar
      // Use selectedRange.startStr and endStr if available (from FullCalendar)
      if (selectedRange.startStr && selectedRange.endStr) {
        // Check if they are strings (from FullCalendar) or need conversion
        const startStr =
          typeof selectedRange.startStr === "string"
            ? selectedRange.startStr
            : formatLocalDateTime(selectedRange.start);
        const endStr =
          typeof selectedRange.endStr === "string"
            ? selectedRange.endStr
            : formatLocalDateTime(selectedRange.end);

        // Use the string values directly to preserve the displayed time
        const startValue = selectedRange.allDay
          ? startStr.split("T")[0]
          : startStr.slice(0, 16); // YYYY-MM-DDTHH:mm
        let endValue = selectedRange.allDay
          ? endStr.split("T")[0]
          : endStr.slice(0, 16);

        // For all-day slots: detect single click vs drag multiple days
        // FullCalendar uses exclusive end, so end date = actual end date + 1
        // For UI display, we need to adjust:
        // - Single click (end = start + 1): set end = start for UI
        // - Drag multiple days (end = actual end + 1): set end = end - 1 for UI
        if (selectedRange.allDay) {
          const startDateOnly = startValue.slice(0, 10);
          const endDateOnlyFromRange = endValue.slice(0, 10);

          // Calculate days difference
          const startDateObj = new Date(startDateOnly);
          const endDateObj = new Date(endDateOnlyFromRange);
          const daysDiff = Math.floor(
            (endDateObj.getTime() - startDateObj.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (daysDiff <= 1) {
            // Single click: FullCalendar gives end = start + 1, set end = start for UI
            endValue = startValue;
          } else {
            // Drag multiple days: FullCalendar gives end = actual end + 1, subtract 1 for UI
            const adjustedEndDate = new Date(endDateObj);
            adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);
            endValue = adjustedEndDate.toISOString().split("T")[0];
          }
        }

        setStart(startValue);
        setEnd(endValue);

        // If start date != end date, open extended mode
        const startDateOnly = startValue.slice(0, 10);
        const endDateOnly = endValue.slice(0, 10);
        if (startDateOnly !== endDateOnly) {
          setShowMore(true);
        }
      } else {
        // Fallback: format Date objects using local time components
        // Only set if both start and end are valid
        const formattedStart = formatLocalDateTime(selectedRange.start);
        let formattedEnd = formatLocalDateTime(selectedRange.end);

        // For all-day slots: detect single click vs drag multiple days
        // FullCalendar uses exclusive end, so end date = actual end date + 1
        // For UI display, we need to adjust:
        // - Single click (end = start + 1): set end = start for UI
        // - Drag multiple days (end = actual end + 1): set end = end - 1 for UI
        if (selectedRange.allDay && formattedStart && formattedEnd) {
          const startDateOnly = formattedStart.slice(0, 10);
          const endDateOnly = formattedEnd.slice(0, 10);

          // Calculate days difference
          const startDateObj = new Date(startDateOnly);
          const endDateObj = new Date(endDateOnly);
          const daysDiff = Math.floor(
            (endDateObj.getTime() - startDateObj.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (daysDiff <= 1) {
            // Single click: FullCalendar gives end = start + 1, set end = start for UI
            formattedEnd = formattedStart;
          } else {
            // Drag multiple days: FullCalendar gives end = actual end + 1, subtract 1 for UI
            const adjustedEndDate = new Date(endDateObj);
            adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);
            const adjustedEndDateStr = adjustedEndDate
              .toISOString()
              .split("T")[0];
            // Preserve time part if exists, otherwise use date only
            formattedEnd = formattedEnd.includes("T")
              ? `${adjustedEndDateStr}T${formattedEnd.split("T")[1]}`
              : adjustedEndDateStr;
          }
        }

        if (formattedStart) setStart(formattedStart);
        if (formattedEnd) setEnd(formattedEnd);
        if (formattedStart && formattedEnd) {
          const startDateOnly = formattedStart.slice(0, 10);
          const endDateOnly = formattedEnd.slice(0, 10);
          if (startDateOnly !== endDateOnly) {
            setShowMore(true);
          }
        }
      }
    } else {
      // No valid selectedRange - use default times
      // Start time = current time + 1 hour (rounded up to the hour)
      // End time = start time + 1 hour
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1);
      nextHour.setMinutes(0);
      nextHour.setSeconds(0);
      nextHour.setMilliseconds(0);

      const endTime = new Date(nextHour);
      endTime.setHours(nextHour.getHours() + 1);

      // Format using local time (browser timezone)
      const formattedStart = formatLocalDateTime(nextHour);
      const formattedEnd = formatLocalDateTime(endTime);

      if (formattedStart) setStart(formattedStart);
      if (formattedEnd) setEnd(formattedEnd);

      // Default to non-all-day when no selectedRange
      setAllDay(false);
    }

    shouldSyncFromRangeRef.current = false;
  }, [selectedRange, open, event]);

  // Initialize state when event prop changes (duplicate event or tempEvent with attendees)
  useEffect(() => {
    if (event && event.uid) {
      // Editing existing event - populate fields with event data
      setTitle(event.title ?? "");
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");

      // Handle all-day events properly
      const isAllDay = event.allday ?? false;
      setAllDay(isAllDay);

      // Get event's timezone for formatting - prioritize event.timezone from server
      let eventTimezone: string;
      if (event.timezone) {
        eventTimezone = resolveTimezone(event.timezone);
      } else {
        eventTimezone = resolvedCalendarTimezone;
      }

      // Format dates based on all-day status and timezone
      if (event.start) {
        if (isAllDay) {
          // For all-day events, use date format (YYYY-MM-DD)
          const startDate = new Date(event.start);
          setStart(startDate.toISOString().split("T")[0]);
        } else {
          // For timed events, format in the event's timezone
          setStart(formatDateTimeInTimezone(event.start, eventTimezone));
        }
      } else {
        setStart("");
      }

      if (event.end) {
        if (isAllDay) {
          // For all-day events, use date format (YYYY-MM-DD)
          const endDate = new Date(event.end);
          setEnd(endDate.toISOString().split("T")[0]);
        } else {
          // For timed events, format in the event's timezone
          setEnd(formatDateTimeInTimezone(event.end, eventTimezone));
        }
      } else {
        setEnd("");
      }

      if (defaultCalendarId) {
        setCalendarid(defaultCalendarId);
      }
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
      setTimezone(eventTimezone);
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
    } else if (event && event.attendee && event.attendee.length > 0) {
      // Handle tempEvent case (no uid but has attendees from temp calendar search)
      setAttendees(
        event.attendee.filter((a) => a.cal_address !== organizer?.cal_address)
      );
    }
  }, [
    event,
    organizer?.cal_address,
    resolvedCalendarTimezone,
    defaultCalendarId,
  ]);

  // Reset state when creating new event (event is empty object or undefined)
  useEffect(() => {
    // Skip if restoring from error - data already restored
    if (isRestoringFromErrorRef.current) {
      return;
    }
    const isCreatingNew = !event || !event.uid;
    const wasInitialized = isInitializedRef.current;

    if (isCreatingNew && wasInitialized) {
      // Creating new event - reset all fields to default
      // Note: start and end are handled by the selectedRange useEffect
      // Note: timezone is handled by separate useEffect above
      setShowMore(false);
      setShowDescription(false);
      setShowRepeat(false);
      setTitle("");
      setDescription("");
      setAttendees([]);
      setLocation("");
      if (defaultCalendarId) {
        setCalendarid(defaultCalendarId);
      }
      setAllDay(false);
      setRepetition({} as RepetitionObject);
      setAlarm("");
      setEventClass("PUBLIC");
      setBusy("OPAQUE");
      setHasVideoConference(false);
      setMeetingLink(null);
    }

    if (!isCreatingNew) {
      isInitializedRef.current = true;
    }
  }, [event, defaultCalendarId]);

  const handleStartChange = useCallback(
    (newStart: string) => {
      setStart(newStart);

      // Defer visual feedback (non-urgent)
      startTransition(() => {
        setSelectedRange((prev: DateSelectArg | null) => {
          const newRange = {
            ...prev,
            start: new Date(newStart),
            startStr: newStart,
            allDay: allday,
          } as DateSelectArg;
          setTimeout(() => {
            calendarRef.current?.select(newRange);
          }, 0);
          return newRange;
        });
      });
    },
    // calendarRef and setSelectedRange are stable refs/setters from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allday]
  );

  const handleEndChange = useCallback(
    (newEnd: string) => {
      setEnd(newEnd);

      // Defer visual feedback (non-urgent)
      startTransition(() => {
        setSelectedRange((prev: DateSelectArg | null) => {
          const newRange = {
            ...prev,
            end: new Date(newEnd),
            endStr: newEnd,
            allDay: allday,
          } as DateSelectArg;
          setTimeout(() => {
            calendarRef.current?.select(newRange);
          }, 0);
          return newRange;
        });
      });
    },
    // calendarRef and setSelectedRange are stable refs/setters from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allday]
  );

  const handleAllDayChange = useCallback(
    (newAllDay: boolean, newStart: string, newEnd: string) => {
      // Update critical state immediately (checkbox response)
      setAllDay(newAllDay);
      setStart(newStart);
      setEnd(newEnd);

      // Defer visual feedback updates (non-urgent)
      startTransition(() => {
        setSelectedRange((prev: DateSelectArg | null) => {
          const newRange = {
            ...prev,
            startStr: newAllDay ? newStart.split("T")[0] : newStart,
            endStr: newAllDay ? newEnd.split("T")[0] : newEnd,
            start: new Date(
              newAllDay ? newStart.split("T")[0] + "T00:00:00" : newStart
            ),
            end: new Date(
              newAllDay ? newEnd.split("T")[0] + "T00:00:00" : newEnd
            ),
            allDay: newAllDay,
          } as DateSelectArg;
          setTimeout(() => {
            calendarRef.current?.select(newRange);
          }, 0);
          return newRange;
        });
      });
    },
    // calendarRef and setSelectedRange are stable refs/setters from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleClose = () => {
    // Clear temp data when user manually closes modal
    clearEventFormTempData("create");
    onClose(false);
    setShowValidationErrors(false);
    resetAllStateToDefault();
    setStart("");
    setEnd("");
    shouldSyncFromRangeRef.current = true; // Reset for next time
  };

  // Function to save current form data to temp storage
  const saveCurrentFormData = useCallback(() => {
    const formState: EventFormState = {
      title,
      description,
      location,
      start,
      end,
      allday,
      repetition,
      attendees,
      alarm,
      busy,
      eventClass,
      timezone,
      calendarid,
      hasVideoConference,
      meetingLink,
      showMore,
      showDescription,
      showRepeat,
      hasEndDateChanged,
    };
    return buildEventFormTempData(formState);
  }, [
    title,
    description,
    location,
    start,
    end,
    allday,
    repetition,
    attendees,
    alarm,
    busy,
    eventClass,
    timezone,
    calendarid,
    hasVideoConference,
    meetingLink,
    showMore,
    showDescription,
    showRepeat,
    hasEndDateChanged,
  ]);

  // Check for temp data when modal opens
  useEffect(() => {
    if (open && !event?.uid) {
      // Only restore for new events (not duplicating)
      const tempData = restoreEventFormDataFromStorage("create");
      if (tempData && tempData.fromError) {
        // Mark that we're restoring from error to prevent other useEffects from overriding
        isRestoringFromErrorRef.current = true;
        // Prevent selectedRange useEffect from running
        shouldSyncFromRangeRef.current = false;

        // Restore form data from previous failed save
        restoreFormDataFromTemp(tempData, {
          setTitle,
          setDescription,
          setLocation,
          setStart,
          setEnd,
          setAllDay,
          setRepetition,
          setAttendees,
          setAlarm,
          setBusy,
          setEventClass,
          setTimezone,
          setCalendarid,
          setHasVideoConference,
          setMeetingLink,
          setShowMore,
          setShowDescription,
          setShowRepeat,
          setHasEndDateChanged,
        });
        // Clear the error flag but keep data until successful save
        const updatedTempData = { ...tempData, fromError: false };
        saveEventFormDataToTemp("create", updatedTempData);

        // Reset flag after restore completes (use setTimeout to ensure other useEffects have checked the flag)
        setTimeout(() => {
          isRestoringFromErrorRef.current = false;
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.uid]);

  const handleSave = async () => {
    // Show validation errors when Save is clicked
    setShowValidationErrors(true);

    // Check if form is valid before saving
    if (!isFormValid) {
      return;
    }
    const newEventUID = crypto.randomUUID();

    // Resolve target calendar safely
    const targetCalendar: Calendars | undefined =
      calList[calendarid] ||
      userPersonalCalendars[0] ||
      (Object.values(calList)[0] as Calendars | undefined);
    if (!targetCalendar || !targetCalendar.id) {
      console.error("No target calendar available to save event");
      return;
    }

    const newEvent: CalendarEvent = {
      calId: targetCalendar.id,
      title,
      URL: `/calendars/${targetCalendar.id}/${newEventUID}.ics`,
      start: "",
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
          cn: organizer?.cn ?? "",
          cal_address: organizer?.cal_address ?? "",
          partstat: "ACCEPTED",
          rsvp: "FALSE",
          role: "CHAIR",
          cutype: "INDIVIDUAL",
        },
      ],
      transp: busy,
      sequence: 1,
      color: targetCalendar?.color,
      alarm: { trigger: alarm, action: "EMAIL" },
      x_openpass_videoconference: meetingLink || undefined,
    };

    if (allday) {
      const startDateOnly = (start || "").split("T")[0];
      const endDateOnlyUI = (end || start || "").split("T")[0];
      // For all-day events, API needs end date = UI end date + 1 day
      const endDateOnlyAPI = addDays(endDateOnlyUI, 1);
      // Parse date string and create Date at UTC midnight to avoid timezone offset issues
      const [startYear, startMonth, startDay] = startDateOnly
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = endDateOnlyAPI.split("-").map(Number);
      const startDateObj = new Date(
        Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
      );
      const endDateObj = new Date(
        Date.UTC(endYear, endMonth - 1, endDay, 0, 0, 0, 0)
      );
      newEvent.start = startDateObj.toISOString();
      newEvent.end = endDateObj.toISOString();
    } else {
      newEvent.start = convertFormDateTimeToISO(start, timezone);
      if (end) {
        // In normal mode, only override end date when the end date field is not shown
        if (!showMore && !hasEndDateChanged) {
          const startDateOnly = (start || "").split("T")[0];
          const endTimeOnly = end.includes("T")
            ? end.split("T")[1]?.slice(0, 5) || "00:00"
            : "00:00";
          const endDateTime = `${startDateOnly}T${endTimeOnly}`;
          newEvent.end = convertFormDateTimeToISO(endDateTime, timezone);
        } else {
          // Extended mode or end date explicitly shown in normal mode: use actual end datetime
          newEvent.end = convertFormDateTimeToISO(end, timezone);
        }
      }
    }

    if (attendees.length > 0) {
      newEvent.attendee = newEvent.attendee.concat(attendees);
    }

    // Reset validation state when validation passes
    setShowValidationErrors(false);

    // Save current form data to temp storage before closing
    const formDataToSave = saveCurrentFormData();
    saveEventFormDataToTemp("create", formDataToSave);

    // Close popup immediately
    onClose(true);

    // Save to API in background
    try {
      const result = await dispatch(
        putEventAsync({
          cal: targetCalendar,
          newEvent,
        })
      );

      // Handle result of putEventAsync - check if rejected first
      // Check if result is a rejected action
      if (result.type && result.type.endsWith("/rejected")) {
        throw new Error(
          result.error?.message || result.payload?.message || "API call failed"
        );
      }

      // If result has unwrap, call it (it will throw if rejected)
      if (result && typeof result.unwrap === "function") {
        try {
          await result.unwrap();
        } catch (unwrapError: any) {
          throw unwrapError;
        }
      }

      if (tempList) {
        const calendarRange = getCalendarRange(new Date(start));
        await updateTempCalendar(tempList, newEvent, dispatch, calendarRange);
      }

      // Clear temp data on successful save
      clearEventFormTempData("create");

      // Reset all state to default values only on successful save
      resetAllStateToDefault();
    } catch (error: any) {
      // API failed - restore form data and mark as error
      const errorFormData = {
        ...formDataToSave,
        fromError: true,
      };
      saveEventFormDataToTemp("create", errorFormData);

      // Show error notification
      showErrorNotification(
        error?.message || "Failed to create event. Please try again."
      );

      // Try to reopen modal by dispatching custom event
      // Parent component should listen to this event and reopen modal
      window.dispatchEvent(
        new CustomEvent("eventModalError", {
          detail: { type: "create" },
        })
      );
    }
  };
  const dialogActions = (
    <Box display="flex" justifyContent="space-between" width="100%" px={2}>
      {!showMore && (
        <Button startIcon={<AddIcon />} onClick={() => setShowMore(!showMore)}>
          {t("common.moreOptions")}
        </Button>
      )}
      <Box display="flex" gap={1} ml={showMore ? "auto" : 0}>
        {showMore && (
          <Button variant="outlined" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
        )}
        <Button variant="contained" onClick={handleSave}>
          {t("actions.save")}
        </Button>
      </Box>
    </Box>
  );

  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={
        event?.uid
          ? t("eventDuplication.duplicateEvent")
          : t("event.createEvent")
      }
      isExpanded={showMore}
      onExpandToggle={() => setShowMore(!showMore)}
      actions={dialogActions}
    >
      <EventFormFields
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        location={location}
        setLocation={setLocation}
        start={start}
        setStart={setStart}
        end={end}
        setEnd={setEnd}
        allday={allday}
        setAllDay={setAllDay}
        repetition={repetition}
        setRepetition={setRepetition}
        attendees={attendees}
        setAttendees={setAttendees}
        alarm={alarm}
        setAlarm={setAlarm}
        busy={busy}
        setBusy={setBusy}
        eventClass={eventClass}
        setEventClass={setEventClass}
        timezone={timezone}
        setTimezone={setTimezone}
        calendarid={calendarid}
        setCalendarid={setCalendarid}
        hasVideoConference={hasVideoConference}
        setHasVideoConference={setHasVideoConference}
        meetingLink={meetingLink}
        setMeetingLink={setMeetingLink}
        showMore={showMore}
        showDescription={showDescription}
        setShowDescription={setShowDescription}
        showRepeat={showRepeat}
        setShowRepeat={setShowRepeat}
        isOpen={open}
        userPersonalCalendars={userPersonalCalendars}
        timezoneList={timezoneList}
        onStartChange={handleStartChange}
        onEndChange={handleEndChange}
        onAllDayChange={handleAllDayChange}
        onValidationChange={setIsFormValid}
        showValidationErrors={showValidationErrors}
        onHasEndDateChangedChange={setHasEndDateChanged}
      />
    </ResponsiveDialog>
  );
}

export default EventPopover;
