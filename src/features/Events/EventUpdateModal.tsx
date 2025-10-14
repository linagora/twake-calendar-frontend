import { Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { ResponsiveDialog } from "../../components/Dialog";
import {
  putEventAsync,
  removeEvent,
  moveEventAsync,
  updateEventInstanceAsync,
  updateSeriesAsync,
  updateEventLocal,
  clearFetchCache,
} from "../Calendars/CalendarSlice";
import { Calendars } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/userDataTypes";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { TIMEZONES } from "../../utils/timezone-data";
import { addVideoConferenceToDescription } from "../../utils/videoConferenceUtils";
import EventFormFields, {
  formatDateTimeInTimezone,
} from "../../components/Event/EventFormFields";
import { getEvent, deleteEvent, putEvent } from "./EventApi";
import { refreshCalendars } from "../../components/Event/utils/eventUtils";
import { getCalendarRange } from "../../utils/dateUtils";

const showErrorNotification = (message: string) => {
  console.error(`[ERROR] ${message}`);
};

function EventUpdateModal({
  eventId,
  calId,
  open,
  onClose,
  onCloseAll,
  eventData,
  typeOfAction,
}: {
  eventId: string;
  calId: string;
  open: boolean;
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
  onCloseAll?: () => void;
  eventData?: CalendarEvent | null;
  typeOfAction?: "solo" | "all";
}) {
  const dispatch = useAppDispatch();

  // Get event from Redux store (cached data) as fallback
  const cachedEvent = useAppSelector(
    (state) => state.calendars.list[calId]?.events[eventId]
  );

  // State for fresh event data
  const [freshEvent, setFreshEvent] = useState<CalendarEvent | null>(null);

  // Use fresh data if available, otherwise use eventData from props, otherwise use cached data
  const event = freshEvent || eventData || cachedEvent;

  // Fetch fresh event data when modal opens
  useEffect(() => {
    if (open && cachedEvent && !eventData) {
      const fetchFreshData = async () => {
        try {
          const freshData = await getEvent(cachedEvent);
          setFreshEvent(freshData);
        } catch (err) {
          // Keep using cached data if API fails
        }
      };

      fetchFreshData();
    }
  }, [open, cachedEvent, eventData]);

  const user = useAppSelector((state) => state.user);

  const calendarsList = useAppSelector((state) => state.calendars.list);

  const userPersonnalCalendars: Calendars[] = useMemo(() => {
    const allCalendars = Object.values(calendarsList);
    return allCalendars.filter(
      (c) => c.id?.split("/")[0] === user.userData?.openpaasId
    );
  }, [calendarsList, user.userData?.openpaasId]);

  // Helper function to resolve timezone aliases
  const resolveTimezone = (tzName: string): string => {
    if (TIMEZONES.zones[tzName]) {
      return tzName;
    }
    if (TIMEZONES.aliases[tzName]) {
      return TIMEZONES.aliases[tzName].aliasTo;
    }
    return tzName;
  };

  const timezoneList = useMemo(() => {
    const zones = Object.keys(TIMEZONES.zones).sort();
    const browserTz = resolveTimezone(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    const getTimezoneOffset = (tzName: string): string => {
      const resolvedTz = resolveTimezone(tzName);
      const tzData = TIMEZONES.zones[resolvedTz];
      if (!tzData) return "";

      const icsMatch = tzData.ics.match(/TZOFFSETTO:([+-]\d{4})/);
      if (!icsMatch) return "";

      const offset = icsMatch[1];
      const hours = parseInt(offset.slice(0, 3));
      const minutes = parseInt(offset.slice(3));

      if (minutes === 0) {
        return `UTC${hours >= 0 ? "+" : ""}${hours}`;
      }
      return `UTC${hours >= 0 ? "+" : ""}${hours}:${Math.abs(minutes).toString().padStart(2, "0")}`;
    };

    return { zones, browserTz, getTimezoneOffset };
  }, []);

  const [showMore, setShowMore] = useState(false);
  const [showDescription, setShowDescription] = useState(
    event?.description ? true : false
  );
  const [showRepeat, setShowRepeat] = useState(
    event?.repetition?.freq ? true : false
  );

  // Form state - initialize with empty values
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allday, setAllDay] = useState(false);
  const [repetition, setRepetition] = useState<RepetitionObject>(
    {} as RepetitionObject
  );
  const [alarm, setAlarm] = useState("");
  const [busy, setBusy] = useState("OPAQUE");
  const [eventClass, setEventClass] = useState("PUBLIC");
  const [timezone, setTimezone] = useState(
    resolveTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  );
  const [newCalId, setNewCalId] = useState(calId);
  const [calendarid, setCalendarid] = useState(0);

  const [attendees, setAttendees] = useState<userAttendee[]>([]);
  const [hasVideoConference, setHasVideoConference] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);
  const [hasValidationError, setHasValidationError] = useState(false);

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
    setTimezone(
      resolveTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    );
    setHasVideoConference(false);
    setMeetingLink(null);
  }, []);

  // Prevent repeated initialization loops
  const initializedKeyRef = useRef<string | null>(null);

  // Initialize form state when event data is available
  useEffect(() => {
    if (event && open) {
      // Editing existing event - populate fields with event data
      setTitle(event.title ?? "");
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");

      // Handle all-day events properly
      const isAllDay = event.allday ?? false;
      setAllDay(isAllDay);

      // Get event's original timezone
      const eventTimezone = event.timezone
        ? resolveTimezone(event.timezone)
        : resolveTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

      // Format dates based on all-day status
      if (event.start) {
        if (isAllDay) {
          // For all-day events, use date format (YYYY-MM-DD)
          const startDate = new Date(event.start);
          setStart(startDate.toISOString().split("T")[0]);
        } else {
          // For timed events, format in the event's original timezone
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
          // For timed events, format in the event's original timezone
          setEnd(formatDateTimeInTimezone(event.end, eventTimezone));
        }
      } else {
        setEnd("");
      }

      // Find correct calendar index
      const currentCalIndex = userPersonnalCalendars.findIndex(
        (cal) => cal.id === calId
      );
      setCalendarid(currentCalIndex >= 0 ? currentCalIndex : 0);

      // Handle repetition properly - check both current event and base event
      const baseEventId = event.uid.split("/")[0];
      const baseEvent = calendarsList[calId]?.events[baseEventId];
      const repetitionSource = event.repetition || baseEvent?.repetition;

      if (repetitionSource && repetitionSource.freq) {
        const repetitionData: RepetitionObject = {
          freq: repetitionSource.freq,
          interval: repetitionSource.interval || 1,
          occurrences: repetitionSource.occurrences,
          endDate: repetitionSource.endDate,
          byday: repetitionSource.byday || null,
        };
        setRepetition(repetitionData);
        setShowRepeat(true);
      } else {
        setRepetition({} as RepetitionObject);
        setShowRepeat(false);
      }

      setAttendees(
        event.attendee
          ? event.attendee.filter(
              (a) => a.cal_address !== event.organizer?.cal_address
            )
          : []
      );
      setAlarm(event.alarm?.trigger ?? "");
      setEventClass(event.class ?? "PUBLIC");
      setBusy(event.transp ?? "OPAQUE");

      const resolvedTimezone = event.timezone
        ? resolveTimezone(event.timezone)
        : resolveTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setTimezone(resolvedTimezone);
      setHasVideoConference(event.x_openpass_videoconference ? true : false);
      setMeetingLink(event.x_openpass_videoconference || null);
      setNewCalId(event.calId || calId);

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
  }, [open, event, calId, userPersonnalCalendars, calendarsList]);

  // Helper to close modal(s) - use onCloseAll if available to close preview modal too
  const closeModal = () => {
    if (onCloseAll) {
      onCloseAll();
    } else {
      onClose({}, "backdropClick");
    }
  };

  const handleClose = () => {
    closeModal();
    resetAllStateToDefault();
    initializedKeyRef.current = null;
  };

  const handleSave = async () => {
    if (!event) return;

    const organizer = event.organizer;

    const targetCalendar = userPersonnalCalendars[calendarid];
    if (!targetCalendar) {
      console.error("Target calendar not found");
      return;
    }

    // Handle recurrence instances
    const [baseUID, recurrenceId] = event.uid.split("/");

    // Check if this is a recurring event
    const isRecurringEvent = !!event.repetition?.freq;

    // When editing "all events" of a recurring series, fetch master event to get original start time
    let masterEventData: CalendarEvent | null = null;
    if (isRecurringEvent && typeOfAction === "all") {
      try {
        // Fetch master event using base UID (without recurrence-id)
        const masterEventToFetch = {
          ...event,
          uid: baseUID, // Use base UID to get master event
        };
        const masterEvent = await getEvent(masterEventToFetch, true);
        masterEventData = masterEvent;
      } catch (err: any) {
        console.error("Failed to fetch master event:", err);
        showErrorNotification("Failed to fetch event data. Please try again.");
        return;
      }
    }

    // Handle start and end dates based on all-day status
    let startDate: string;
    let endDate: string;

    // For "all events" update, use master event's DATE but apply user's TIME from form
    if (masterEventData && typeOfAction === "all") {
      if (allday) {
        // For all-day events, use date from master event
        startDate = new Date(masterEventData.start).toISOString().split("T")[0];
        if (masterEventData.end) {
          endDate = new Date(masterEventData.end).toISOString().split("T")[0];
        } else {
          endDate = startDate;
        }
      } else {
        // For timed events: combine master's date with form's time (both in event timezone)
        // Format master's start in event timezone to get proper date
        const masterFormattedStart = formatDateTimeInTimezone(
          masterEventData.start,
          timezone
        );
        const masterFormattedEnd = masterEventData.end
          ? formatDateTimeInTimezone(masterEventData.end, timezone)
          : masterFormattedStart;

        // Extract date portion from master (YYYY-MM-DD)
        const masterDatePart = masterFormattedStart.split("T")[0];
        const masterEndDatePart = masterFormattedEnd.split("T")[0];

        // Extract time portion from form input (HH:MM or HH:MM:SS)
        const formTimePart = start.includes("T")
          ? start.split("T")[1]
          : start.substring(11);
        const formEndTimePart = end.includes("T")
          ? end.split("T")[1]
          : end.substring(11);

        // Combine master's date + form's time
        const combinedStartStr = `${masterDatePart}T${formTimePart}`;
        const combinedEndStr = `${masterEndDatePart}T${formEndTimePart}`;

        // Parse and convert to ISO (assume local timezone matches event timezone for form input)
        startDate = new Date(combinedStartStr).toISOString();
        endDate = new Date(combinedEndStr).toISOString();
      }
    } else {
      // For single events or "solo" edits, use the edited dates from form
      if (allday) {
        // For all-day events, use date format (YYYY-MM-DD)
        startDate = new Date(start).toISOString().split("T")[0];
        endDate = new Date(end).toISOString().split("T")[0];
      } else {
        // For timed events, use full datetime
        startDate = new Date(start).toISOString();
        endDate = new Date(end).toISOString();
      }
    }

    const newEvent: CalendarEvent = {
      calId: newCalId || calId,
      title,
      URL: event.URL ?? `/calendars/${newCalId || calId}/${event.uid}.ics`,
      start: startDate,
      end: endDate,
      allday,
      uid: event.uid,
      description,
      location,
      repetition,
      class: eventClass,
      organizer: organizer,
      timezone,
      attendee: organizer
        ? [organizer as userAttendee, ...attendees]
        : attendees,
      transp: busy,
      color: targetCalendar?.color,
      alarm: { trigger: alarm, action: "EMAIL" },
      x_openpass_videoconference: meetingLink || undefined,
    };

    // Special case: When converting recurring event to non-recurring
    if (
      recurrenceId &&
      typeOfAction === "all" &&
      event.repetition?.freq &&
      !repetition.freq
    ) {
      const baseUID = event.uid.split("/")[0];

      // Close modal immediately for better UX
      closeModal();

      try {
        // STEP 1: Delete ALL instances of recurring event
        // Note: This system stores instances only, no master event file

        // Collect all instances that need to be deleted
        const instancesToDelete = Object.keys(targetCalendar.events)
          .filter((eventId) => eventId.split("/")[0] === baseUID)
          .map((eventId) => targetCalendar.events[eventId]);

        // Get unique URLs to avoid deleting same file multiple times
        const uniqueURLs = new Set<string>();
        const instancesByURL = new Map<string, CalendarEvent[]>();

        instancesToDelete.forEach((instance) => {
          if (!instancesByURL.has(instance.URL)) {
            instancesByURL.set(instance.URL, []);
          }
          instancesByURL.get(instance.URL)!.push(instance);
          uniqueURLs.add(instance.URL);
        });

        // Delete each unique URL once
        const deletePromises = Array.from(uniqueURLs).map(async (url) => {
          try {
            await deleteEvent(url);
          } catch (deleteError: any) {
            // Silently ignore 404 - file might already be deleted
            const is404 =
              deleteError.response?.status === 404 ||
              deleteError.message?.includes("404") ||
              deleteError.message?.includes("Not Found");

            if (!is404) {
              console.error(
                `Failed to delete event file: ${deleteError.message}`
              );
            }
          }
        });

        await Promise.all(deletePromises);

        // Small delay to ensure backend processes deletions
        await new Promise((resolve) => setTimeout(resolve, 100));

        // STEP 2: Create new non-recurring event
        const newEventUID = crypto.randomUUID();
        const finalNewEvent = {
          ...newEvent,
          uid: newEventUID,
          URL: `/calendars/${newCalId || calId}/${newEventUID}.ics`,
        };

        // STEP 3: Persist new event to server
        await putEvent(finalNewEvent, targetCalendar.ownerEmails?.[0]);

        // STEP 4: Update Redux store - Add new event first to prevent empty grid
        dispatch(updateEventLocal({ calId, event: finalNewEvent }));

        // STEP 5: Remove old recurring instances (swap is now instant)
        Object.keys(targetCalendar.events).forEach((eventId) => {
          if (eventId.split("/")[0] === baseUID) {
            dispatch(removeEvent({ calendarUid: calId, eventUid: eventId }));
          }
        });

        // Clear cache to ensure navigation to other weeks works
        dispatch(clearFetchCache(calId));
      } catch (err) {
        console.error("Failed to convert recurring to non-recurring:", err);
        // Keep modal open on error, user can retry or cancel
      }

      return;
    }

    // Close popup immediately for better UX (for non-special cases)
    closeModal();

    // Execute API calls in background based on typeOfAction
    if (recurrenceId) {
      if (typeOfAction === "solo") {
        // Update single instance with optimistic update + rollback
        const oldEvent = { ...event };

        dispatch(
          updateEventLocal({
            calId,
            event: { ...newEvent, recurrenceId },
          })
        );

        dispatch(
          updateEventInstanceAsync({
            cal: targetCalendar,
            event: { ...newEvent, recurrenceId },
          })
        )
          .unwrap()
          .catch((error) => {
            dispatch(updateEventLocal({ calId, event: oldEvent }));
            showErrorNotification("Failed to update event. Changes reverted.");
          });
      } else if (typeOfAction === "all") {
        // Update all instances - check if repetition rules changed
        const baseUID = event.uid.split("/")[0];

        // Normalize repetition objects for accurate comparison
        const normalizeRepetition = (rep: RepetitionObject | undefined) => {
          if (!rep || !rep.freq) return null;

          return {
            freq: rep.freq,
            interval: rep.interval || 1,
            byday:
              !rep.byday || rep.byday.length === 0
                ? null
                : [...rep.byday].sort(),
            occurrences: rep.occurrences || null,
            endDate: rep.endDate || null,
          };
        };

        const oldRepetition = normalizeRepetition(event.repetition);
        const newRepetition = normalizeRepetition(repetition);

        // Normalize timezone for comparison (undefined, null, "" → null, resolve aliases)
        const normalizeTimezone = (tz: string | undefined | null) => {
          if (!tz) return null;
          // Resolve timezone aliases (e.g., Asia/Saigon → Asia/Ho_Chi_Minh)
          return resolveTimezone(tz);
        };

        const oldTimezone = normalizeTimezone(event.timezone);
        const newTimezone = normalizeTimezone(timezone);
        const timezoneChanged = oldTimezone !== newTimezone;

        // Check if TIME changed (compare time portion only, not date)
        // We need to compare against master event's time, not current instance's time
        const extractTimeFromForm = (localDateTimeStr: string) => {
          // Form input is local datetime string like "2025-10-15T09:00"
          // Extract just the time portion
          if (!localDateTimeStr) return null;
          const timePart = localDateTimeStr.includes("T")
            ? localDateTimeStr.split("T")[1]
            : localDateTimeStr.substring(11);
          return timePart?.substring(0, 5); // HH:MM
        };

        const extractTimeFromISO = (
          isoString: string | undefined,
          tz: string
        ) => {
          // Format ISO datetime in event timezone and extract time
          if (!isoString) return null;
          const formatted = formatDateTimeInTimezone(isoString, tz);
          const timePart = formatted.includes("T")
            ? formatted.split("T")[1]
            : formatted.substring(11);
          return timePart?.substring(0, 5); // HH:MM
        };

        const masterOldStart = masterEventData?.start || event.start;
        const masterOldEnd = masterEventData?.end || event.end;

        // Extract time from form input (local time)
        const formStartTime = extractTimeFromForm(start);
        const formEndTime = extractTimeFromForm(end);

        // Extract time from master event (in event timezone)
        const oldStartTime = extractTimeFromISO(masterOldStart, timezone);
        const oldEndTime = extractTimeFromISO(masterOldEnd, timezone);

        const timeChanged =
          formStartTime !== oldStartTime || formEndTime !== oldEndTime;

        const repetitionRulesChanged =
          JSON.stringify(oldRepetition) !== JSON.stringify(newRepetition) ||
          timezoneChanged ||
          event.allday !== allday ||
          timeChanged;

        if (repetitionRulesChanged) {
          // Date/time or repetition rules changed - remove all overrides and refresh

          // STEP 1: Remove ALL old instances from UI (including solo overrides)
          Object.keys(targetCalendar.events).forEach((eventId) => {
            if (eventId.split("/")[0] === baseUID) {
              dispatch(removeEvent({ calendarUid: calId, eventUid: eventId }));
            }
          });

          // STEP 2: Update series on server with removeOverrides=true (await to ensure it completes)
          await dispatch(
            updateSeriesAsync({
              cal: targetCalendar,
              event: { ...newEvent, recurrenceId },
              removeOverrides: true,
            })
          ).unwrap();

          // STEP 3: Fetch to get new instances with correct timing
          const calendarRange = getCalendarRange(new Date(start));
          await refreshCalendars(
            dispatch,
            Object.values(calendarsList),
            calendarRange
          );

          // Clear cache after reload
          dispatch(clearFetchCache(calId));
        } else {
          // Only properties changed - use optimistic update and keep overrides

          // Store old instances for rollback
          const oldInstances: Record<string, CalendarEvent> = {};
          Object.keys(targetCalendar.events)
            .filter((eventId) => eventId.split("/")[0] === baseUID)
            .forEach((eventId) => {
              oldInstances[eventId] = { ...targetCalendar.events[eventId] };
            });

          // Optimistic update: Apply new properties to all instances immediately
          Object.keys(oldInstances).forEach((eventId) => {
            const instance = oldInstances[eventId];

            dispatch(
              updateEventLocal({
                calId,
                event: {
                  ...instance,
                  title: newEvent.title,
                  description: newEvent.description,
                  location: newEvent.location,
                  class: newEvent.class,
                  transp: newEvent.transp,
                  attendee: newEvent.attendee,
                  alarm: newEvent.alarm,
                  x_openpass_videoconference:
                    newEvent.x_openpass_videoconference,
                },
              })
            );
          });

          // Update server in background with removeOverrides=false
          dispatch(
            updateSeriesAsync({
              cal: targetCalendar,
              event: { ...newEvent, recurrenceId },
              removeOverrides: false,
            })
          )
            .unwrap()
            .then(() => {
              // Clear cache to ensure navigation shows updated data
              dispatch(clearFetchCache(calId));
            })
            .catch((error: any) => {
              // Rollback: Restore old instances on error
              Object.values(oldInstances).forEach((oldEvent) => {
                dispatch(updateEventLocal({ calId, event: oldEvent }));
              });

              showErrorNotification(
                "Failed to update recurring event. Changes reverted."
              );
            });
        }
      }
    } else {
      // Non-recurring event (or converting to recurring)

      // Special case: Converting no-repeat to repeat
      if (!event.repetition?.freq && repetition?.freq) {
        const oldEventUID = event.uid;

        // API call: putEventAsync will create recurring event and fetch all instances
        dispatch(putEventAsync({ cal: targetCalendar, newEvent }))
          .unwrap()
          .then(() => {
            // Remove old single event AFTER new recurring instances are added to store
            // This prevents empty grid during the transition
            dispatch(
              removeEvent({ calendarUid: calId, eventUid: oldEventUID })
            );

            // Clear cache to ensure navigation to other weeks works
            dispatch(clearFetchCache(calId));
          })
          .catch((error: any) => {
            showErrorNotification("Failed to create recurring event.");
          });
      } else {
        // Normal non-recurring event update
        dispatch(putEventAsync({ cal: targetCalendar, newEvent }));
      }
    }

    // Handle calendar change
    if (newCalId !== calId) {
      dispatch(
        moveEventAsync({
          cal: targetCalendar,
          newEvent,
          newURL: `/calendars/${newCalId}/${event.uid}.ics`,
        })
      );
      dispatch(removeEvent({ calendarUid: calId, eventUid: event.uid }));
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
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!title || hasValidationError}
        >
          Save
        </Button>
      </Box>
    </Box>
  );

  if (!event) return null;

  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title="Update Event"
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
        typeOfAction={typeOfAction}
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
        showRepeat={typeOfAction !== "solo" && showRepeat}
        setShowRepeat={setShowRepeat}
        userPersonnalCalendars={userPersonnalCalendars}
        timezoneList={timezoneList}
        onCalendarChange={(newCalendarId) => {
          const selectedCalendar = userPersonnalCalendars[newCalendarId];
          if (selectedCalendar) {
            setNewCalId(selectedCalendar.id);
          }
        }}
        onValidationChange={(hasError) => setHasValidationError(hasError)}
      />
    </ResponsiveDialog>
  );
}

export default EventUpdateModal;
