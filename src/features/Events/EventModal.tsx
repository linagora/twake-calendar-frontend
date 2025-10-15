import { CalendarApi, DateSelectArg } from "@fullcalendar/core";
import {
  Box,
  Button,
} from "@mui/material";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { ResponsiveDialog } from "../../components/Dialog";
import EventFormFields, { FieldWithLabel, formatLocalDateTime } from "../../components/Event/EventFormFields";
import { putEventAsync } from "../Calendars/CalendarSlice";
import { Calendars } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/userDataTypes";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { createSelector } from "@reduxjs/toolkit";
import { TIMEZONES } from "../../utils/timezone-data";
import {
  getTimezoneOffset,
  resolveTimezone,
} from "../../components/Calendar/TimezoneSelector";


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

  const timezoneList = useMemo(() => {
    const zones = Object.keys(TIMEZONES.zones).sort();
    const browserTz = resolveTimezone(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    return { zones, browserTz };
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
  const [timezone, setTimezone] = useState(
    event?.timezone ? resolveTimezone(event.timezone) : calendarTimezone
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
    setTimezone(timezoneList.browserTz);
    setHasVideoConference(false);
    setMeetingLink(null);
  }, [calendarTimezone, timezoneList.browserTz]);

  useEffect(() => {
    if (selectedRange) {
      setStart(
        selectedRange ? formatLocalDateTime(selectedRange.start, timezone) : ""
      );
      setEnd(
        selectedRange ? formatLocalDateTime(selectedRange.end, timezone) : ""
      );
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
        event.timezone ? resolveTimezone(event.timezone) : timezoneList.browserTz
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
  }, [event, organizer?.cal_address, calendarTimezone]);

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
      setTimezone(timezoneList.browserTz);
      setHasVideoConference(false);
      setMeetingLink(null);
    }
    isInitializedRef.current = true;
  }, [event, calendarTimezone]);

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
        userPersonnalCalendars={userPersonnalCalendars}
        timezoneList={{
          zones: timezoneList.zones,
          browserTz: timezoneList.browserTz,
          getTimezoneOffset: getTimezoneOffset
        }}
        onStartChange={(newStart) => {
          const startISO = formatLocalDateTime(new Date(newStart), timezone);
          const newRange = {
            ...selectedRange,
            start: new Date(startISO),
            startStr: startISO,
            allDay: allday,
          };
          setSelectedRange(newRange);
          calendarRef.current?.select(newRange);
        }}
        onEndChange={(newEnd) => {
          const endISO = formatLocalDateTime(new Date(newEnd), timezone);
          const newRange = {
            ...selectedRange,
            end: new Date(endISO),
            endStr: endISO,
            allDay: allday,
          };
          setSelectedRange(newRange);
          calendarRef.current?.select(newRange);
        }}
        onAllDayChange={(newAllDay) => {
          const endDate = new Date(end);
          const startDate = new Date(start);
          if (endDate.getDate() === startDate.getDate()) {
            endDate.setDate(startDate.getDate() + 1);
            setEnd(formatLocalDateTime(endDate, timezone));
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
    </ResponsiveDialog>
  );
}

export default EventPopover;

