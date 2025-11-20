import { TIMEZONES } from "../../utils/timezone-data";
import { resolveTimezone } from "../../components/Calendar/TimezoneSelector";
import { CalendarEvent, RepetitionObject } from "./EventsTypes";
import { userAttendee } from "../User/userDataTypes";
import { formatDateTimeInTimezone } from "../../components/Event/utils/dateTimeFormatters";
import { addVideoConferenceToDescription } from "../../utils/videoConferenceUtils";

export interface TimezoneListResult {
  zones: string[];
  browserTz: string;
  getTimezoneOffset: (tzName: string) => string;
}

export function createTimezoneList(): TimezoneListResult {
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
}

export interface PopulateFormFromEventParams {
  event: CalendarEvent;
  calendarTimezone?: string;
  organizerEmail?: string;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setLocation: (value: string) => void;
  setStart: (value: string) => void;
  setEnd: (value: string) => void;
  setAllDay: (value: boolean) => void;
  setRepetition: (value: RepetitionObject) => void;
  setShowRepeat: (value: boolean) => void;
  setAttendees: (value: userAttendee[]) => void;
  setAlarm: (value: string) => void;
  setEventClass: (value: string) => void;
  setBusy: (value: string) => void;
  setTimezone: (value: string) => void;
  setHasVideoConference: (value: boolean) => void;
  setMeetingLink: (value: string | null) => void;
  setCalendarid?: (value: string) => void;
  calendarsList?: Record<string, any>;
  calId?: string;
}

export function populateFormFromEvent(
  params: PopulateFormFromEventParams
): void {
  const {
    event,
    calendarTimezone,
    organizerEmail,
    setTitle,
    setDescription,
    setLocation,
    setStart,
    setEnd,
    setAllDay,
    setRepetition,
    setShowRepeat,
    setAttendees,
    setAlarm,
    setEventClass,
    setBusy,
    setTimezone,
    setHasVideoConference,
    setMeetingLink,
    setCalendarid,
    calendarsList,
    calId,
  } = params;

  // Basic fields
  setTitle(event.title ?? "");
  setDescription(event.description ?? "");
  setLocation(event.location ?? "");

  // Handle all-day events
  const isAllDay = event.allday ?? false;
  setAllDay(isAllDay);

  // Get event's timezone for formatting
  const eventTimezone = event.timezone
    ? resolveTimezone(event.timezone)
    : calendarTimezone ||
      resolveTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Format dates based on all-day status and timezone
  if (event.start) {
    if (isAllDay) {
      const startDate = new Date(event.start);
      setStart(startDate.toISOString().split("T")[0]);
    } else {
      setStart(formatDateTimeInTimezone(event.start, eventTimezone));
    }
  } else {
    setStart("");
  }

  if (event.end) {
    if (isAllDay) {
      const endDate = new Date(event.end);
      setEnd(endDate.toISOString().split("T")[0]);
    } else {
      setEnd(formatDateTimeInTimezone(event.end, eventTimezone));
    }
  } else {
    setEnd("");
  }

  // Calendar
  if (setCalendarid && calId) {
    setCalendarid(calId);
  }

  // Handle repetition - check both current event and base event (for update modal)
  let repetitionSource = event.repetition;
  if (calendarsList && calId && event.uid) {
    const baseEventId = event.uid.split("/")[0];
    const baseEvent = calendarsList[calId]?.events[baseEventId];
    if (baseEvent?.repetition) {
      repetitionSource = baseEvent.repetition;
    }
  }

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

  // Attendees - filter out organizer
  const organizerAddress = organizerEmail || event.organizer?.cal_address;
  setAttendees(
    event.attendee
      ? event.attendee.filter(
          (a: userAttendee) => a.cal_address !== organizerAddress
        )
      : []
  );

  // Other fields
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
}
