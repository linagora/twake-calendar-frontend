import { convertEventDateTimeToISO } from "@/utils/timezone";
import moment from "moment-timezone";
import { Calendar } from "../../Calendars/CalendarTypes";
import {
  RepetitionRule,
  VCalComponent,
  VObjectProperty,
} from "../../Calendars/types/CalendarData";
import { userAttendee } from "../../User/models/attendee";
import { createAttendee } from "../../User/models/attendee.mapper";
import { AlarmObject, CalendarEvent } from "../EventsTypes";
import { buildDelegatedEventURL } from "./buildDelegatedEventURL";
import { formatDateToICal } from "./formatDateToICal";
import { inferTimezoneFromValue } from "./inferTimezoneFromValue";

const KNOWN_PROPS = new Set([
  "uid",
  "transp",
  "dtstart",
  "dtend",
  "class",
  "x-openpaas-videoconference",
  "summary",
  "description",
  "location",
  "organizer",
  "attendee",
  "dtstamp",
  "sequence",
  "recurrence-id",
  "exdate",
  "status",
  "duration",
  "rrule",
]);

export function parseCalendarEvent(
  data: VObjectProperty[],
  color: Record<string, string>,
  calendar: Calendar,
  eventURL: string,
  valarm?: VCalComponent
): CalendarEvent {
  const event: Partial<CalendarEvent> = { color, attendee: [] };
  let recurrenceId;
  let duration;
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  for (const [key, params, , value] of data) {
    switch (key.toLowerCase()) {
      case "uid":
        event.uid = String(value);
        break;
      case "transp":
        event.transp = String(value);
        break;
      case "dtstart": {
        event.start = String(value);
        const detectedTz = inferTimezoneFromValue(
          params as Record<string, string>
        );
        if (detectedTz) {
          event.timezone = detectedTz;
        }
        if (dateRegex.test(String(value))) {
          event.allday = true;
        } else {
          event.allday = false;
        }
        break;
      }
      case "dtend": {
        event.end = String(value);
        if (!event.timezone) {
          const detectedTz = inferTimezoneFromValue(
            params as Record<string, string>
          );
          if (detectedTz) {
            event.timezone = detectedTz;
          }
        }
        if (dateRegex.test(String(value))) {
          event.allday = true;
        } else {
          event.allday = false;
        }
        break;
      }
      case "class":
        if (
          ["PRIVATE", "PUBLIC", "CONFIDENTIAL"].includes(
            String(value).toUpperCase()
          )
        ) {
          event.class = String(value).toUpperCase() as CalendarEvent["class"];
        }
        break;
      case "x-openpaas-videoconference":
        event.x_openpass_videoconference = String(value);
        break;
      case "summary":
        event.title = String(value);
        break;
      case "description":
        event.description = String(value);
        break;
      case "location":
        event.location = String(value);
        break;
      case "organizer": {
        const paramsObj = params as Record<string, string>;
        event.organizer = {
          cn: paramsObj?.cn ?? "",
          cal_address: String(value).replace(/^mailto:/i, ""),
        };
        break;
      }
      case "attendee": {
        const paramsObj = params as Record<string, string>;
        if (
          !event.attendee?.find(
            (attendee) =>
              attendee.cal_address === String(value).replace(/^mailto:/i, "")
          )
        ) {
          (event.attendee as userAttendee[]).push(
            createAttendee({
              cn: paramsObj?.cn,
              cal_address: String(value).replace(/^mailto:/i, ""),
              partstat: paramsObj?.partstat as userAttendee["partstat"],
              rsvp: paramsObj?.rsvp as userAttendee["rsvp"],
              role: paramsObj?.role as userAttendee["role"],
              cutype: paramsObj?.cutype as userAttendee["cutype"],
            })
          );
        }
        break;
      }
      case "dtstamp":
        event.stamp = String(value);
        break;
      case "sequence":
        event.sequence = Number(value);
        break;
      case "recurrence-id":
        recurrenceId = String(value);
        break;
      case "exdate":
        if (!event.exdates) event.exdates = [];
        event.exdates.push(String(value));
        break;
      case "status":
        event.status = String(value);
        break;
      case "duration":
        duration = String(value);
        break;
      case "rrule": {
        const ruleValue = value as RepetitionRule;
        event.repetition = { freq: ruleValue.freq.toLowerCase() };
        if (ruleValue.byday) {
          if (typeof ruleValue.byday === "string") {
            event.repetition.byday = [ruleValue.byday];
          } else {
            event.repetition.byday = ruleValue.byday;
          }
        }
        if (ruleValue.until) {
          event.repetition.endDate = ruleValue.until;
        }
        if (ruleValue.count) {
          event.repetition.occurrences = ruleValue.count;
        }
        if (ruleValue.interval) {
          event.repetition.interval = ruleValue.interval;
        }
        break;
      }
    }
  }
  if (recurrenceId && event.uid) {
    event.uid = `${event.uid}/${recurrenceId}`;
    event.recurrenceId = recurrenceId;
  }

  if (valarm) {
    event.alarm = {} as AlarmObject;
    for (const [key, , , value] of valarm[1]) {
      switch (key.toLowerCase()) {
        case "action":
          event.alarm.action = String(value);
          break;
        case "trigger":
          event.alarm.trigger = String(value);
          break;
      }
    }
  }
  event.calId = calendar.id;
  event.URL = calendar.delegated
    ? buildDelegatedEventURL(calendar, eventURL)
    : eventURL;
  if (!event.uid || !event.start) {
    console.error(
      `missing crucial event param in calendar ${calendar.id} `,
      data
    );
    event.error = `missing crucial event param in calendar ${calendar.id} `;
  }

  const eventTimezone = event.timezone;

  if (!event.end) {
    const start = event.start ? new Date(event.start) : new Date();
    const timeToAdd = duration
      ? moment.duration(duration).asMilliseconds()
      : moment.duration(30, "minutes").asMilliseconds();
    const artificialEnd = new Date(start.getTime() + timeToAdd);
    event.end = formatDateToICal(artificialEnd, false, eventTimezone);
  }

  if (!event.allday && event.start && eventTimezone) {
    const startISO = convertEventDateTimeToISO(event.start, eventTimezone);
    if (startISO) {
      event.start = startISO;
    }
  }

  if (!event.allday && event.end && eventTimezone) {
    const endISO = convertEventDateTimeToISO(event.end, eventTimezone);
    if (endISO) {
      event.end = endISO;
    }
  }
  event.passthroughProps = data.filter(
    ([key]) => !KNOWN_PROPS.has(key.toLowerCase())
  );

  return event as CalendarEvent;
}
