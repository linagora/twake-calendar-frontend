import { convertFormDateTimeToISO } from "@/components/Event/utils/dateTimeHelpers";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import { convertEventDateTimeToISO, resolveTimezoneId } from "@/utils/timezone";
import { TIMEZONES } from "@/utils/timezone-data";
import ICAL from "ical.js";
import moment from "moment-timezone";
import {
  RepetitionRule,
  VObjectProperty,
} from "../Calendars/types/CalendarData";
import { userAttendee } from "../User/models/attendee";
import { createAttendee } from "../User/models/attendee.mapper";
import { AlarmObject, CalendarEvent, RepetitionObject } from "./EventsTypes";

function inferTimezoneFromValue(
  params: Record<string, string> | undefined
): string | undefined {
  if (!params) {
    return undefined;
  }

  const tzParam =
    params.tzid || params.TZID || params.Tzid || params.tZid || params.tzId;

  if (tzParam) {
    const resolved = resolveTimezoneId(tzParam);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
}

export function parseCalendarEvent(
  data: VObjectProperty[],
  color: Record<string, string>,
  calendarid: string,
  eventURL: string,
  valarm?: VObjectProperty[]
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
        event.class = String(value);
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
  event.calId = calendarid;
  event.URL = eventURL;
  if (!event.uid || !event.start) {
    console.error(
      `missing crucial event param in calendar ${calendarid} `,
      data
    );
    event.error = `missing crucial event param in calendar ${calendarid} `;
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

  return event as CalendarEvent;
}

export function calendarEventToJCal(
  event: CalendarEvent,
  calOwnerEmail?: string
) {
  const tzid = event.timezone; // Fallback to UTC if no timezone provided

  const vevent = makeVevent(event, tzid, calOwnerEmail);

  const timezoneData = TIMEZONES.zones[event.timezone];
  const vtimezone = makeTimezone(timezoneData, event);

  return ["vcalendar", [], [vevent, vtimezone.component.jCal]];
}

export function makeTimezone(
  timezoneData: { ics: string; latitude: string; longitude: string },
  event: CalendarEvent
) {
  if (!timezoneData) {
    return new ICAL.Timezone({
      component: TIMEZONES.zones["Etc/UTC"].ics,
      tzid: "Etc/UTC",
    });
  }
  return new ICAL.Timezone({
    component: timezoneData.ics,
    tzid: event.timezone,
  });
}

export function makeVevent(
  event: CalendarEvent,
  tzid: string,
  calOwnerEmail: string | undefined,
  isMasterEvent?: boolean
) {
  const vevent: [string, unknown[]] = [
    "vevent",
    [
      ["uid", {}, "text", extractEventBaseUuid(event.uid)],
      ["transp", {}, "text", event.transp ?? "OPAQUE"],
      [
        "dtstart",
        { tzid },
        event.allday ? "date" : "date-time",
        formatDateToICal(new Date(event.start), event.allday ?? false, tzid),
      ],
      ["class", {}, "text", event.class ?? "PUBLIC"],
      ["sequence", {}, "integer", event.sequence ?? 1],
      [
        "x-openpaas-videoconference",
        {},
        "unknown",
        event.x_openpass_videoconference ?? null,
      ],
      ["summary", {}, "text", event.title ?? ""],
    ],
  ];
  if (event.alarm?.trigger) {
    const valarm = [
      ["trigger", {}, "duration", event.alarm.trigger],
      ["action", {}, "text", event.alarm.action],
      ["attendee", {}, "cal-address", `mailto:${calOwnerEmail}`],
      ["summary", {}, "text", event.title],
      [
        "description",
        {},
        "text",
        "This is an automatic alarm sent by OpenPaas",
      ],
    ];
    vevent.push([["valarm", valarm]]);
  }

  if (event.end) {
    vevent[1].push([
      "dtend",
      { tzid },
      event.allday ? "date" : "date-time",
      formatDateToICal(new Date(event.end), event.allday ?? false, tzid),
    ]);
  }
  if (event.organizer) {
    vevent[1].push([
      "organizer",
      { cn: event.organizer.cn },
      "cal-address",
      `mailto:${event.organizer.cal_address}`,
    ]);
  }
  if (event.location) {
    vevent[1].push(["location", {}, "text", event.location]);
  }
  if (event.recurrenceId && !isMasterEvent) {
    vevent[1].push(["recurrence-id", {}, "date-time", event.recurrenceId]);
  }
  if (event.description) {
    vevent[1].push(["description", {}, "text", event.description]);
  }
  if (event.repetition?.freq) {
    const repetitionRule: RepetitionRule = { freq: event.repetition.freq };
    if (event.repetition.interval) {
      repetitionRule.interval = event.repetition.interval;
    }
    if (event.repetition.occurrences) {
      repetitionRule.count = event.repetition.occurrences;
    }
    if (event.repetition.endDate) {
      repetitionRule.until = event.repetition.endDate;
    }
    if (
      event.repetition.byday !== null &&
      event.repetition.byday !== undefined
    ) {
      repetitionRule.byday = event.repetition.byday;
    }
    vevent[1].push(["rrule", {}, "recur", repetitionRule]);
  }

  event.attendee.forEach((att) => {
    const attendee: Record<string, string> = {
      partstat: att.partstat,
      rsvp: att.rsvp,
      role: att.role,
      cutype: att.cutype,
    };
    if (att.cn) {
      attendee.cn = att.cn;
    }
    vevent[1].push([
      "attendee",
      attendee,
      "cal-address",
      `mailto:${att.cal_address}`,
    ]);
  });

  if (event.exdates && event.exdates.length > 0) {
    event.exdates.forEach((ex) => {
      vevent[1].push([
        "exdate",
        { tzid },
        "date-time",
        formatDateToICal(new Date(ex), false, tzid),
      ]);
    });
  }

  return vevent;
}

function formatDateToICal(date: Date, allday: boolean, timezone?: string) {
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (allday) {
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    return `${year}-${month}-${day}`;
  }

  if (timezone) {
    const momentDate = moment.utc(date).tz(timezone);
    if (momentDate.isValid()) {
      return momentDate.format("YYYY-MM-DDTHH:mm:ss");
    }
  }

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
}

/**
 * Combine master event's date with form input's time for recurring event updates
 * Preserves original start date while applying new time from user input
 */
export function combineMasterDateWithFormTime(
  masterEvent: CalendarEvent,
  formStart: string,
  formEnd: string,
  timezone: string,
  isAllDay: boolean,
  formatDateTimeInTimezone: (iso: string, tz: string) => string
): { startDate: string; endDate: string } {
  if (isAllDay) {
    // Extract date string from master event (which is ISO UTC string)
    const startDateStr = new Date(masterEvent.start)
      .toISOString()
      .split("T")[0];
    const endDateStr = masterEvent.end
      ? new Date(masterEvent.end).toISOString().split("T")[0]
      : startDateStr;

    // Parse date string and create Date at UTC midnight to avoid timezone offset issues
    const [startYear, startMonth, startDay] = startDateStr
      .split("-")
      .map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);
    const startDateObj = new Date(
      Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
    );
    const endDateObj = new Date(
      Date.UTC(endYear, endMonth - 1, endDay, 0, 0, 0, 0)
    );

    return {
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
    };
  }

  // For timed events: combine master's date with form's time
  const masterFormattedStart = formatDateTimeInTimezone(
    masterEvent.start,
    timezone
  );
  const masterFormattedEnd = masterEvent.end
    ? formatDateTimeInTimezone(masterEvent.end, timezone)
    : masterFormattedStart;

  // Extract date portion from master (YYYY-MM-DD)
  const masterDatePart = masterFormattedStart.split("T")[0];
  const masterEndDatePart = masterFormattedEnd.split("T")[0];

  // Extract time portion from form input (HH:MM or HH:MM:SS)
  const formTimePart = formStart.includes("T")
    ? formStart.split("T")[1]
    : formStart.substring(11);
  const formEndTimePart = formEnd.includes("T")
    ? formEnd.split("T")[1]
    : formEnd.substring(11);

  // Combine master's date + form's time
  const combinedStartStr = `${masterDatePart}T${formTimePart}`;
  const combinedEndStr = `${masterEndDatePart}T${formEndTimePart}`;

  // Parse and convert to ISO
  const startDate = convertFormDateTimeToISO(combinedStartStr, timezone);
  const endDate = convertFormDateTimeToISO(combinedEndStr, timezone);

  return { startDate, endDate };
}

/**
 * Normalize repetition object for accurate comparison
 */
export function normalizeRepetition(repetition: RepetitionObject | undefined): {
  freq: string;
  interval: number;
  byday: string[] | null;
  occurrences: number | null;
  endDate: string | null;
} | null {
  if (!repetition || !repetition.freq) return null;

  return {
    freq: repetition.freq,
    interval: repetition.interval || 1,
    byday:
      !repetition.byday || repetition.byday.length === 0
        ? null
        : [...repetition.byday].sort(),
    occurrences: repetition.occurrences || null,
    endDate: repetition.endDate || null,
  };
}

/**
 * Normalize timezone by resolving aliases
 */
export function normalizeTimezone(
  timezone: string | undefined | null,
  resolveTimezone: (tz: string) => string
): string | null {
  if (!timezone) return null;
  return resolveTimezone(timezone);
}

/**
 * Detect what changed in recurring event update
 */
export function detectRecurringEventChanges(
  oldEvent: CalendarEvent,
  newData: {
    repetition: RepetitionObject;
    timezone: string;
    allday: boolean;
    start: string;
    end: string;
  },
  masterEventData: CalendarEvent | null,
  resolveTimezone: (tz: string) => string
): {
  timeChanged: boolean;
  timezoneChanged: boolean;
  repetitionRulesChanged: boolean;
} {
  const oldTimezone = resolveTimezone(oldEvent.timezone || "UTC");
  const newTimezone = resolveTimezone(newData.timezone || "UTC");
  const timezoneChanged = oldTimezone !== newTimezone;

  // Use master event as the source of truth for the "old" times,
  // falling back to the clicked instance if master isn't available.
  const oldStart = masterEventData?.start || oldEvent.start;
  const oldEnd = masterEventData?.end || oldEvent.end;

  // Parse old times (ISO strings from the server) into the event's timezone
  // and extract HH:mm for comparison.
  const oldStartTime = moment.tz(oldStart, oldTimezone).format("HH:mm");
  const oldEndTime = moment.tz(oldEnd, oldTimezone).format("HH:mm");
  // Parse new times from the form. These may be either:
  //   - local datetime strings like "2025-01-15T10:00" (from the form)
  //   - ISO strings like "2025-01-15T10:00:00.000Z" (if pre-converted)
  // moment.tz with a format avoids ambiguous parsing in both cases.
  const newStartTime = moment.tz(newData.start, newTimezone).format("HH:mm");
  const newEndTime = moment.tz(newData.end, newTimezone).format("HH:mm");

  const timeChanged =
    oldStartTime !== newStartTime || oldEndTime !== newEndTime;

  const repetitionRulesChanged =
    JSON.stringify(normalizeRepetition(oldEvent.repetition)) !==
      JSON.stringify(normalizeRepetition(newData.repetition)) ||
    timezoneChanged ||
    oldEvent.allday !== newData.allday ||
    timeChanged;

  return {
    timeChanged,
    timezoneChanged,
    repetitionRulesChanged,
  };
}
