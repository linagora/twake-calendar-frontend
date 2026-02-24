import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { updateAttendeesAfterTimeChange } from "@/components/Calendar/handlers/eventHandlers";
import { ResponsiveDialog } from "@/components/Dialog";
import EventFormFields from "@/components/Event/EventFormFields";
import { addDays } from "@/components/Event/utils/dateRules";
import { formatDateTimeInTimezone } from "@/components/Event/utils/dateTimeFormatters";
import { convertFormDateTimeToISO } from "@/components/Event/utils/dateTimeHelpers";
import {
  buildEventFormTempData,
  clearEventFormTempData,
  EventFormContext,
  EventFormState,
  restoreEventFormDataFromTemp as restoreEventFormDataFromStorage,
  restoreFormDataFromTemp,
  saveEventFormDataToTemp,
  showErrorNotification,
} from "@/utils/eventFormTempStorage";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import {
  browserDefaultTimeZone,
  getTimezoneOffset,
  resolveTimezone,
} from "@/utils/timezone";
import { TIMEZONES } from "@/utils/timezone-data";
import { addVideoConferenceToDescription } from "@/utils/videoConferenceUtils";
import { Box, Button } from "@linagora/twake-mui";
import AddIcon from "@mui/icons-material/Add";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "twake-i18n";
import { Calendar } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/models/attendee";
import { getEvent } from "./EventApi";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { moveEventBetweenCalendars } from "./updateEventHelpers/moveEventBetweenCalendars";
import {
  convertRecurringToSingleEvent,
  updateRecurringEvent,
  updateSingleEvent,
} from "./updateEventHelpers/updateEventHelpers";

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
  onClose: (event: unknown, reason: "backdropClick" | "escapeKeyDown") => void;
  onCloseAll?: () => void;
  eventData?: CalendarEvent | null;
  typeOfAction?: "solo" | "all";
}) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const calList = useAppSelector((state) => state.calendars.list);
  // Get event from Redux store (cached data) as fallback
  const cachedEvent = useAppSelector(
    (state) => state.calendars.list[calId]?.events[eventId]
  );

  // Use fresh data if available, otherwise use eventData from props, otherwise use cached data
  const event = eventData || cachedEvent;

  const user = useAppSelector((state) => state.user);

  // if the event's calendar is delegated then it shall be the only calendar accessible from the event update modal
  const userPersonalCalendars: Calendar[] = useMemo(() => {
    const allCalendars = Object.values(calList) as Calendar[];
    return allCalendars.filter(
      (calendar: Calendar) =>
        calendar.id?.split("/")[0] === user.userData?.openpaasId ||
        calendar.delegated
    );
  }, [calList, user.userData?.openpaasId]);

  const timezoneList = useMemo(() => {
    const zones = Object.keys(TIMEZONES.zones).sort();
    const browserTz = resolveTimezone(browserDefaultTimeZone);

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
    resolveTimezone(browserDefaultTimeZone)
  );
  const [newCalId, setNewCalId] = useState(calId);
  const defaultCalendarId = useMemo(
    () => userPersonalCalendars[0]?.id ?? "",
    [userPersonalCalendars]
  );

  const [calendarid, setCalendarid] = useState(calId ?? defaultCalendarId);

  const [attendees, setAttendees] = useState<userAttendee[]>([]);
  const [hasVideoConference, setHasVideoConference] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [hasEndDateChanged, setHasEndDateChanged] = useState(false);

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
    setTimezone(resolveTimezone(browserDefaultTimeZone));
    setHasVideoConference(false);
    setMeetingLink(null);
  }, [defaultCalendarId]);

  // Prevent repeated initialization loops
  const initializedKeyRef = useRef<string | null>(null);
  // Track when restoring from error to prevent other useEffects from overriding restored data
  const isRestoringFromErrorRef = useRef(false);

  // State to hold the master event when editing "all events"
  const [masterEvent, setMasterEvent] = useState<CalendarEvent | null>(null);
  const [isLoadingMasterEvent, setIsLoadingMasterEvent] = useState(false);

  // Fetch master event when editing "all events" of a recurring series
  useEffect(() => {
    if (!event || !open || typeOfAction !== "all") {
      setMasterEvent(null);
      return;
    }

    const isRecurringEvent = !!event.repetition?.freq;
    if (!isRecurringEvent) {
      setMasterEvent(null);
      return;
    }

    // Check if this is an instance (has recurrence-id)
    const [baseUID, recurrenceId] = event.uid.split("/");
    if (!recurrenceId) {
      // This is already the master event
      setMasterEvent(event);
      return;
    }

    // Fetch the master event
    const fetchMasterEvent = async () => {
      setIsLoadingMasterEvent(true);
      try {
        const masterEventToFetch = {
          ...event,
          uid: baseUID, // Use base UID to get master event
        };
        const fetchedMasterEvent = await getEvent(masterEventToFetch, true);
        setMasterEvent(fetchedMasterEvent);
      } catch (err) {
        console.error("Failed to fetch master event:", err);
        // Fallback to using the clicked instance
        setMasterEvent(event);
      } finally {
        setIsLoadingMasterEvent(false);
      }
    };

    fetchMasterEvent();
  }, [event, open, typeOfAction]);

  // Initialize form state when event data is available
  useEffect(() => {
    // Skip if restoring from error - data already restored
    if (isRestoringFromErrorRef.current) {
      return;
    }

    // Skip if still loading master event
    if (isLoadingMasterEvent) {
      return;
    }

    if (event && open) {
      // Use master event for "all" action, otherwise use the clicked event
      const eventToDisplay =
        typeOfAction === "all" && masterEvent ? masterEvent : event;

      // Reset validation errors when modal opens
      setShowValidationErrors(false);

      // Editing existing event - populate fields with event data
      setTitle(eventToDisplay.title ?? "");
      setDescription(eventToDisplay.description ?? "");
      setLocation(eventToDisplay.location ?? "");

      // Handle all-day events properly
      const isAllDay = eventToDisplay.allday ?? false;
      setAllDay(isAllDay);

      // Get event's original timezone
      const eventTimezone = eventToDisplay.timezone
        ? resolveTimezone(eventToDisplay.timezone)
        : resolveTimezone(browserDefaultTimeZone);

      // Format dates based on all-day status
      if (eventToDisplay.start) {
        if (isAllDay) {
          // For all-day events, use date format (YYYY-MM-DD)
          const startDate = new Date(eventToDisplay.start);
          setStart(startDate.toISOString().split("T")[0]);
        } else {
          // For timed events, format in the event's original timezone
          setStart(
            formatDateTimeInTimezone(eventToDisplay.start, eventTimezone)
          );
        }
      } else {
        setStart("");
      }

      if (eventToDisplay.end) {
        if (isAllDay) {
          // For all-day events, use date format (YYYY-MM-DD)
          const endDate = new Date(eventToDisplay.end);
          endDate.setDate(endDate.getDate() - 1);
          setEnd(endDate.toISOString().split("T")[0]);
        } else {
          // For timed events, format in the event's original timezone
          setEnd(formatDateTimeInTimezone(eventToDisplay.end, eventTimezone));
        }
      } else {
        setEnd("");
      }

      // Find correct calendar index
      setCalendarid(calId);

      // Handle repetition properly - check both current event and base event
      const baseEventId = extractEventBaseUuid(eventToDisplay.uid);
      const baseEvent = calList[calId]?.events[baseEventId];
      const repetitionSource =
        eventToDisplay.repetition || baseEvent?.repetition;

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
        eventToDisplay.attendee
          ? eventToDisplay.attendee.filter(
              (a: userAttendee) =>
                a.cal_address !== eventToDisplay.organizer?.cal_address
            )
          : []
      );
      setAlarm(eventToDisplay.alarm?.trigger ?? "");
      setEventClass(eventToDisplay.class ?? "PUBLIC");
      setBusy(eventToDisplay.transp ?? "OPAQUE");

      if (eventToDisplay.timezone) {
        const resolvedTimezone = resolveTimezone(eventToDisplay.timezone);
        setTimezone(resolvedTimezone);
      } else {
        const browserTz = resolveTimezone(browserDefaultTimeZone);
        setTimezone(browserTz);
      }
      setHasVideoConference(
        eventToDisplay.x_openpass_videoconference ? true : false
      );
      setMeetingLink(eventToDisplay.x_openpass_videoconference || null);
      setNewCalId(eventToDisplay.calId || calId);

      // Update description to include video conference footer if exists
      if (
        eventToDisplay.x_openpass_videoconference &&
        eventToDisplay.description
      ) {
        const hasVideoFooter = eventToDisplay.description.includes("Visio:");
        if (!hasVideoFooter) {
          setDescription(
            addVideoConferenceToDescription(
              eventToDisplay.description,
              eventToDisplay.x_openpass_videoconference
            )
          );
        } else {
          setDescription(eventToDisplay.description);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    event,
    calId,
    userPersonalCalendars,
    calList,
    masterEvent,
    isLoadingMasterEvent,
  ]);

  // Helper to close modal(s) - use onCloseAll if available to close preview modal too
  const closeModal = () => {
    if (onCloseAll) {
      onCloseAll();
    } else {
      onClose({}, "backdropClick");
    }
  };

  const handleClose = () => {
    // Clear temp data when user manually closes modal
    clearEventFormTempData("update");
    closeModal();
    setShowValidationErrors(false);
    resetAllStateToDefault();
    initializedKeyRef.current = null;
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
    const context: EventFormContext = {
      eventId,
      calId,
      typeOfAction,
    };
    return buildEventFormTempData(formState, context);
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
    eventId,
    calId,
    typeOfAction,
  ]);

  // Check for temp data when modal opens
  useEffect(() => {
    if (open && event) {
      const tempData = restoreEventFormDataFromStorage("update");
      if (
        tempData &&
        tempData.fromError &&
        tempData.eventId === eventId &&
        tempData.calId === calId &&
        tempData.typeOfAction === typeOfAction
      ) {
        // Mark that we're restoring from error to prevent other useEffects from overriding
        isRestoringFromErrorRef.current = true;

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
        saveEventFormDataToTemp("update", updatedTempData);

        // Reset flag after restore completes (use setTimeout to ensure other useEffects have checked the flag)
        setTimeout(() => {
          isRestoringFromErrorRef.current = false;
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId, calId, typeOfAction]);

  const handleSave = async () => {
    // Show validation errors when Save is clicked
    setShowValidationErrors(true);

    // Check if form is valid before saving
    if (!isFormValid) {
      return;
    }

    if (!event) {
      return;
    }

    const organizer = event.organizer;

    const targetCalendar = calList[calendarid];
    if (!targetCalendar) {
      console.error("Target calendar not found");
      return;
    }

    // Reset validation state when validation passes
    setShowValidationErrors(false);

    // Handle recurrence instances
    const [baseUID, recurrenceId] = event.uid.split("/");

    // Check if this is a recurring event
    const isRecurringEvent = !!event.repetition?.freq;

    const getSeriesInstances = (): Record<string, CalendarEvent> => {
      const instances: Record<string, CalendarEvent> = {};
      const seriesEvents = targetCalendar.events || {};

      Object.keys(seriesEvents).forEach((eventId) => {
        const instance = seriesEvents[eventId];
        if (instance && extractEventBaseUuid(eventId) === baseUID) {
          instances[eventId] = { ...instance };
        }
      });

      return instances;
    };

    // When editing "all events" of a recurring series, use the master event we already fetched
    let masterEventData: CalendarEvent | null = null;
    if (isRecurringEvent && typeOfAction === "all") {
      // We already have the master event from state
      masterEventData = masterEvent;

      if (!masterEventData) {
        // This shouldn't happen, but handle it gracefully
        const formDataToSave = saveCurrentFormData();
        const errorFormData = {
          ...formDataToSave,
          fromError: true,
        };
        saveEventFormDataToTemp("update", errorFormData);

        showErrorNotification(
          "Failed to load master event data. Please try again."
        );

        // Dispatch eventModalError to reopen modal
        window.dispatchEvent(
          new CustomEvent("eventModalError", {
            detail: { type: "update", eventId, calId, typeOfAction },
          })
        );
        return;
      }
    }

    // Handle start and end dates based on all-day status
    let startDate: string;
    let endDate: string;

    // For single events or "solo" edits, use the edited dates from form
    if (allday) {
      // For all-day events, use date format (YYYY-MM-DD)
      // Extract date string directly to avoid timezone conversion issues
      const startDateOnly = (start || "").split("T")[0];
      const endDateOnlyUI = (end || start || "").split("T")[0];
      // API needs end date = UI end date + 1 day
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
      startDate = startDateObj.toISOString();
      endDate = endDateObj.toISOString();
    } else {
      // For timed events
      startDate = convertFormDateTimeToISO(start, timezone);
      // In normal mode, only override end date when the end date field is not shown and end date is same as start date
      const startDateOnly = (start || "").split("T")[0];
      const endDateOnly = (end || "").split("T")[0];
      if (!showMore && !hasEndDateChanged && startDateOnly === endDateOnly) {
        const endTimeOnly = end.includes("T")
          ? end.split("T")[1]?.slice(0, 5) || "00:00"
          : "00:00";
        const endDateTime = `${startDateOnly}T${endTimeOnly}`;
        endDate = convertFormDateTimeToISO(endDateTime, timezone);
      } else {
        // Extended mode or end date explicitly shown in normal mode or end date differs from start date: use actual end datetime
        endDate = convertFormDateTimeToISO(end, timezone);
      }
    }

    const eventStartChanged =
      new Date(event.start).getTime() !== new Date(startDate).getTime();
    const eventEndChanged =
      new Date(event?.end ?? "").getTime() !== new Date(endDate).getTime();
    const timeChanged = eventStartChanged || eventEndChanged;

    const newEvent: CalendarEvent = {
      ...updateAttendeesAfterTimeChange(event, timeChanged, attendees),
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
      transp: busy,
      sequence: (event.sequence ?? 1) + 1,
      color: targetCalendar?.color,
      alarm: { trigger: alarm, action: "EMAIL" },
      x_openpass_videoconference: meetingLink || undefined,
    };

    if (
      recurrenceId &&
      typeOfAction === "all" &&
      event.repetition?.freq &&
      !repetition.freq
    ) {
      // Save current form data to temp storage before closing
      const formDataToSave = saveCurrentFormData();
      saveEventFormDataToTemp("update", formDataToSave);

      // Close modal immediately for better UX
      closeModal();

      await convertRecurringToSingleEvent({
        dispatch,
        event,
        newEvent,
        targetCalendar,
        calId,
        newCalId,
        getSeriesInstances,
        onSuccess: () => {
          resetAllStateToDefault();
          initializedKeyRef.current = null;
        },
        onError: (err) => {
          const errorObj = err as { message?: string };
          saveEventFormDataToTemp("update", {
            ...formDataToSave,
            fromError: true,
          });
          showErrorNotification(
            errorObj.message ||
              "Failed to convert recurring event. Please try again."
          );
          window.dispatchEvent(
            new CustomEvent("eventModalError", {
              detail: { type: "update", eventId, calId, typeOfAction },
            })
          );
        },
      });
      return;
    }

    // Save current form data to temp storage before closing
    const formDataToSave = saveCurrentFormData();
    saveEventFormDataToTemp("update", formDataToSave);

    // Close popup immediately for better UX (for non-special cases)
    closeModal();

    // Execute API calls in background based on typeOfAction
    try {
      if (recurrenceId) {
        // Recurring instance: solo override or update-all
        await updateRecurringEvent({
          dispatch,
          calList,
          newEvent,
          calId,
          event,
          recurrenceId,
          typeOfAction,
          masterEventData,
          repetition,
          timezone,
          allday,
          start,
          end,
        });
      } else {
        // Non-recurring event (or converting to recurring, or moving calendar)
        await updateSingleEvent({
          dispatch,
          newEvent,
          calId,
          newCalId,
          event,
          targetCalendar,
        });
      }

      // Handle calendar change (move to a different calendar)
      if (newCalId !== calId) {
        await moveEventBetweenCalendars({
          dispatch,
          calList,
          newEvent,
          oldCalId: calId,
          newCalId,
        });

        // Clear temp data on successful move
        clearEventFormTempData("update");
      }

      // Reset all state to default values only on successful save (after all branches)
      clearEventFormTempData("update");
      resetAllStateToDefault();
      initializedKeyRef.current = null;
    } catch (error) {
      // Check if error is an object with a message property
      const errorObj = error as { message?: string };

      // Handle errors for all branches
      // Rollback optimistic updates if any
      // API failed - restore form data and mark as error
      const errorFormData = {
        ...formDataToSave,
        fromError: true,
      };
      saveEventFormDataToTemp("update", errorFormData);

      // Show error notification
      showErrorNotification(
        errorObj.message || "Failed to update event. Please try again."
      );

      // Try to reopen modal
      window.dispatchEvent(
        new CustomEvent("eventModalError", {
          detail: { type: "update", eventId, calId, typeOfAction },
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
        <Button variant="outlined" onClick={handleClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" onClick={handleSave}>
          {t("actions.save")}
        </Button>
      </Box>
    </Box>
  );

  if (!event) return null;

  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={t("event.updateEvent")}
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
        isOpen={open}
        userPersonalCalendars={userPersonalCalendars}
        timezoneList={timezoneList}
        onCalendarChange={(newCalendarId) => {
          const selectedCalendar = calList[newCalendarId];
          if (selectedCalendar) {
            setNewCalId(selectedCalendar.id);
          }
        }}
        onValidationChange={setIsFormValid}
        showValidationErrors={showValidationErrors}
        onHasEndDateChangedChange={setHasEndDateChanged}
      />
    </ResponsiveDialog>
  );
}

export default EventUpdateModal;
