import { Calendars } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/userDataTypes";
import { CalendarEvent } from "./EventsTypes";
import ICAL from "ical.js";
import { TIMEZONES } from "../../utils/timezone-data";
type RawEntry = [string, Record<string, string>, string, any];

export function parseCalendarEvent(
  data: RawEntry[],
  color: string,
  calendarid: string,
  eventURL: string
): CalendarEvent {
  const event: Partial<CalendarEvent> = { color, attendee: [] };
  let recurrenceId;
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  for (const [key, params, type, value] of data) {
    switch (key.toLowerCase()) {
      case "uid":
        event.uid = value;
        break;
      case "transp":
        event.transp = value;
        break;
      case "dtstart":
        event.start = value;
        if (dateRegex.test(value)) {
          event.allday = true;
        } else {
          event.allday = false;
        }
        break;
      case "dtend":
        event.end = value;
        if (dateRegex.test(value)) {
          event.allday = true;
        } else {
          event.allday = false;
        }
        break;
      case "class":
        event.class = value;
        break;
      case "x-openpaas-videoconference":
        event.x_openpass_videoconference = value;
        break;
      case "summary":
        event.title = value;
        break;
      case "description":
        event.description = value;
        break;
      case "location":
        event.location = value;
        break;
      case "organizer":
        event.organizer = {
          cn: params?.cn ?? "",
          cal_address: value.replace(/^mailto:/, ""),
        };
        break;
      case "attendee":
        (event.attendee as userAttendee[]).push({
          cn: params?.cn ?? "",
          cal_address: value.replace(/^mailto:/, ""),
          partstat: params?.partstat ?? "",
          rsvp: params?.rsvp ?? "",
          role: params?.role ?? "",
          cutype: params?.cutype ?? "",
        });
        break;
      case "dtstamp":
        event.stamp = value;
        break;
      case "sequence":
        event.sequence = Number(value);
        break;
      case "recurrence-id":
        recurrenceId = value;
        break;
      case "status":
        event.status = String(value);
        break;
      case "rrule":
        event.repetition = { freq: value.freq.toLowerCase() };
        if (value.byday) {
          event.repetition.selectedDays = value.byday;
        }
        if (value.until) {
          event.repetition.selectedDays = value.endDate;
        }
        if (value.count) {
          event.repetition.selectedDays = value.occurrences;
        }
        if (value.interval) {
          event.repetition.interval = value.interval;
        }
        break;
    }
  }
  if (recurrenceId && event.uid) {
    event.uid = `${event.uid}/${recurrenceId}`;
  }

  event.URL = eventURL;
  if (!event.uid || !event.start) {
    console.error(
      `missing crucial event param in calendar ${calendarid} `,
      data
    );
    event.error = `missing crucial event param in calendar ${calendarid} `;
  }

  return event as CalendarEvent;
}

export function calendarEventToJCal(event: CalendarEvent): any[] {
  const tzid = event.timezone; // Fallback to UTC if no timezone provided

  const vevent: any[] = [
    "vevent",
    [
      ["uid", {}, "text", event.uid.split("/")[0]],
      ["transp", {}, "text", event.transp ?? "OPAQUE"],
      [
        "dtstart",
        { tzid },
        event.allday ? "date" : "date-time",
        formatDateToICal(new Date(event.start), event.allday ?? false),
      ],
      ["class", {}, "text", event.class ?? "PUBLIC"],
      [
        "x-openpaas-videoconference",
        {},
        "unknown",
        event.x_openpass_videoconference ?? null,
      ],
      ["summary", {}, "text", event.title ?? ""],
    ],
    [],
  ];

  if (event.end) {
    if (event.allday && event.end.getTime() === event.start.getTime()) {
      event.end.setDate(event.start.getDate() + 1);
    }
    vevent[1].push([
      "dtend",
      { tzid },
      event.allday ? "date" : "date-time",
      formatDateToICal(new Date(event.end), event.allday ?? false),
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
  if (event.description) {
    vevent[1].push(["description", {}, "text", event.description]);
  }
  if (event.repetition?.freq) {
    const repetitionRule: Record<string, any> = { freq: event.repetition.freq };
    if (event.repetition.interval) {
      repetitionRule["interval"] = event.repetition.interval;
    }
    if (event.repetition.occurrences) {
      repetitionRule["count"] = event.repetition.occurrences;
    }
    if (event.repetition.endDate) {
      repetitionRule["until"] = event.repetition.endDate;
    }
    if (event.repetition.selectedDays) {
      repetitionRule["byday"] = event.repetition.selectedDays;
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

  const vtimezone = new ICAL.Timezone({
    component: TIMEZONES.zones[event.timezone].ics,
    tzid: event.timezone,
  });
  return ["vcalendar", [], [vevent, vtimezone.component.jCal]];
}
function formatDateToICal(date: Date, allday: Boolean) {
  // Format date like: 2025-02-14T11:00:00 (local time)

  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  if (allday) {
    return `${year}-${month}-${day}`;
  }
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
