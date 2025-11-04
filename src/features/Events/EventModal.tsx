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
import EventFormFields, {
  formatLocalDateTime,
  formatDateTimeInTimezone,
} from "../../components/Event/EventFormFields";

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
  const tempList = useAppSelector((state) => state.calendars.templist);
  const calList = useAppSelector((state) => state.calendars.list);
  const selectPersonnalCalendars = createSelector(
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
  const userPersonnalCalendars: Calendars[] = useAppSelector(
    selectPersonnalCalendars
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

  const [title, setTitle] = useState(event?.title ?? "");

  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [start, setStart] = useState(event?.start ? event.start : "");
  const [end, setEnd] = useState(event?.end ? event.end : "");
  const [calendarid, setCalendarid] = useState(
    event?.calId ?? userPersonnalCalendars[0]?.id
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

  // Use ref to track if we've already initialized to avoid infinite loop
  const isInitializedRef = useRef(false);
  const userPersonnalCalendarsRef = useRef(userPersonnalCalendars);

  // Update ref when userPersonnalCalendars changes
  useEffect(() => {
    userPersonnalCalendarsRef.current = userPersonnalCalendars;
  }, [userPersonnalCalendars]);

  useEffect(() => {
    if (!calendarid && userPersonnalCalendars.length > 0) {
      setCalendarid(userPersonnalCalendars[0].id);
    }
  }, [calendarid, userPersonnalCalendars]);

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
    setCalendarid(userPersonnalCalendars[0]?.id);
    setAllDay(false);
    setRepetition({} as RepetitionObject);
    setAlarm("");
    setEventClass("PUBLIC");
    setBusy("OPAQUE");
    setTimezone(calendarTimezone);
    setHasVideoConference(false);
    setMeetingLink(null);
  }, [calendarTimezone]);

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
        setStart(
          selectedRange.allDay ? startStr.split("T")[0] : startStr.slice(0, 16) // YYYY-MM-DDTHH:mm
        );
        setEnd(
          selectedRange.allDay ? endStr.split("T")[0] : endStr.slice(0, 16)
        );
      } else {
        // Fallback: format Date objects using local time components
        // Only set if both start and end are valid
        const formattedStart = formatLocalDateTime(selectedRange.start);
        const formattedEnd = formatLocalDateTime(selectedRange.end);
        if (formattedStart) setStart(formattedStart);
        if (formattedEnd) setEnd(formattedEnd);
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

      setCalendarid(userPersonnalCalendars[0].id);
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
      setCalendarid(userPersonnalCalendars[0].id);
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
          calendarRef.current?.select(newRange);
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
          calendarRef.current?.select(newRange);
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
          calendarRef.current?.select(newRange);
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

    const newEvent: CalendarEvent = {
      calId: calList[calendarid].id,
      title,
      URL: `/calendars/${calList[calendarid].id}/${newEventUID}.ics`,
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
          cn: organizer?.cn ?? "",
          cal_address: organizer?.cal_address ?? "",
          partstat: "ACCEPTED",
          rsvp: "FALSE",
          role: "CHAIR",
          cutype: "INDIVIDUAL",
        },
      ],
      transp: busy,
      color: calList[calendarid]?.color,
      alarm: { trigger: alarm, action: "EMAIL" },
      x_openpass_videoconference: meetingLink || undefined,
    };
    if (end) {
      newEvent.end = new Date(end).toISOString();
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
        cal: calList[calendarid],
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
          More options
        </Button>
      )}
      <Box display="flex" gap={1} ml={showMore ? "auto" : 0}>
        {showMore && (
          <Button variant="outlined" onClick={handleClose}>
            Cancel
          </Button>
        )}
        <Button variant="contained" onClick={handleSave}>
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
        userPersonnalCalendars={userPersonnalCalendars}
        timezoneList={timezoneList}
        onStartChange={handleStartChange}
        onEndChange={handleEndChange}
        onAllDayChange={handleAllDayChange}
        onValidationChange={setIsFormValid}
        showValidationErrors={showValidationErrors}
      />
    </ResponsiveDialog>
  );
}

export default EventPopover;
