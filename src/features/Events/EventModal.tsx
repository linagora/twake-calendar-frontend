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
import { addDays } from "../../components/Event/utils/dateRules";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";

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
  const { t } = useI18n();

  const organizer = useAppSelector((state) => state.user.organiserData);
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const tempList = useAppSelector((state) => state.calendars.templist);
  const calList = useAppSelector((state) => state.calendars.list);
  const selectPersonalCalendars = createSelector(
    (state: any) => state.calendars,
    (calendars: any) =>
      Object.keys(calendars.list)
        .map((id) => {
          if (id.split("/")[0] === userId) {
            return calendars.list[id];
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
    const browserTz = resolveTimezone(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    return { zones, browserTz, getTimezoneOffset };
  }, []);

  const calendarTimezone = useAppSelector((state) => state.calendars.timeZone);

  const [showMore, setShowMore] = useState(false);
  const [showDescription, setShowDescription] = useState(
    event?.description ? true : false
  );
  const [showRepeat, setShowRepeat] = useState(
    event?.repetition?.freq ? true : false
  );

  const [title, setTitle] = useState(event?.title || t("event.untitled"));

  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [start, setStart] = useState(event?.start ? event.start : "");
  const [end, setEnd] = useState(event?.end ? event.end : "");
  const [calendarid, setCalendarid] = useState(
    event?.calId ?? userPersonalCalendars[0]?.id ?? ""
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
    event?.timezone ? resolveTimezone(event.timezone) : calendarTimezone
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

  // Update ref when userPersonalCalendars changes
  useEffect(() => {
    userPersonalCalendarsRef.current = userPersonalCalendars;
  }, [userPersonalCalendars]);

  useEffect(() => {
    if (!calendarid && userPersonalCalendars.length > 0) {
      setCalendarid(userPersonalCalendars[0].id);
    }
  }, [calendarid, userPersonalCalendars]);

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
    if (
      userPersonalCalendars &&
      userPersonalCalendars.length > 0 &&
      userPersonalCalendars[0]?.id
    ) {
      setCalendarid(userPersonalCalendars[0].id);
    }
    setAllDay(false);
    setRepetition({} as RepetitionObject);
    setAlarm("");
    setEventClass("PUBLIC");
    setBusy("OPAQUE");
    setTimezone(calendarTimezone);
    setHasVideoConference(false);
    setMeetingLink(null);
  }, [calendarTimezone, userPersonalCalendars]);

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
        const resolvedTimezone = resolveTimezone(calendarTimezone);
        setTimezone(resolvedTimezone);
      }
    }

    // Update previous open state
    prevOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.uid, calendarTimezone]);

  // Separately sync timezone when calendarTimezone changes while modal is open for new events
  useEffect(() => {
    if (open && (!event || !event.uid)) {
      const resolvedTimezone = resolveTimezone(calendarTimezone);
      setTimezone(resolvedTimezone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarTimezone, open, event?.uid]);

  // Set start/end times when modal opens for new event creation
  useEffect(() => {
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

      // Get event's timezone for formatting
      const eventTimezone = event.timezone
        ? resolveTimezone(event.timezone)
        : calendarTimezone;

      // Handle all-day events properly
      const isAllDay = event.allday ?? false;
      setAllDay(isAllDay);

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

      if (
        userPersonalCalendars &&
        userPersonalCalendars.length > 0 &&
        userPersonalCalendars[0]?.id
      ) {
        setCalendarid(userPersonalCalendars[0].id);
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
  }, [event, organizer?.cal_address, calendarTimezone]);

  // Reset state when creating new event (event is empty object or undefined)
  useEffect(() => {
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
      if (
        userPersonalCalendars &&
        userPersonalCalendars.length > 0 &&
        userPersonalCalendars[0]?.id
      ) {
        setCalendarid(userPersonalCalendars[0].id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.uid]);

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
    onClose({}, "backdropClick");
    setShowValidationErrors(false);
    resetAllStateToDefault();
    setStart("");
    setEnd("");
    shouldSyncFromRangeRef.current = true; // Reset for next time
  };

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
      color: targetCalendar?.color,
      alarm: { trigger: alarm, action: "EMAIL" },
      x_openpass_videoconference: meetingLink || undefined,
    };

    if (allday) {
      const startDateOnly = (start || "").split("T")[0];
      const endDateOnlyUI = (end || start || "").split("T")[0];
      // For all-day events, API needs end date = UI end date + 1 day
      const endDateOnlyAPI = addDays(endDateOnlyUI, 1);
      const startDateObj = new Date(`${startDateOnly}T00:00:00`);
      const endDateObj = new Date(`${endDateOnlyAPI}T00:00:00`);
      newEvent.start = startDateObj.toISOString();
      newEvent.end = endDateObj.toISOString();
    } else {
      newEvent.start = new Date(start).toISOString();
      if (end) {
        // In normal mode, only override end date when the end date field is not shown
        if (!showMore && !hasEndDateChanged) {
          const startDateOnly = (start || "").split("T")[0];
          const endTimeOnly = end.includes("T")
            ? end.split("T")[1]?.slice(0, 5) || "00:00"
            : "00:00";
          const endDateTime = `${startDateOnly}T${endTimeOnly}`;
          newEvent.end = new Date(endDateTime).toISOString();
        } else {
          // Extended mode or end date explicitly shown in normal mode: use actual end datetime
          newEvent.end = new Date(end).toISOString();
        }
      }
    }

    if (attendees.length > 0) {
      newEvent.attendee = newEvent.attendee.concat(attendees);
    }

    // Reset validation state when validation passes
    setShowValidationErrors(false);

    // Close popup immediately
    onClose({}, "backdropClick");

    // Reset all state to default values
    resetAllStateToDefault();

    // Save to API in background
    await dispatch(
      putEventAsync({
        cal: targetCalendar,
        newEvent,
      })
    );
    if (tempList) {
      const calendarRange = getCalendarRange(new Date(start));
      await updateTempCalendar(tempList, newEvent, dispatch, calendarRange);
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
