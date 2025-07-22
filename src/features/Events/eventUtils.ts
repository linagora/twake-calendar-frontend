import { Calendars } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/userDataTypes";
import { CalendarEvent } from "./EventsTypes";
import ICAL from "ical.js";
import { TIMEZONES } from "../../utils/timezone-data";
type RawEntry = [string, Record<string, string>, string, any];

export function parseCalendarEvent(
  data: RawEntry[],
  color: string,
  calendarid: string
): CalendarEvent {
  const event: Partial<CalendarEvent> = { color, attendee: [] };
  let recurrenceId;

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
        break;
      case "dtend":
        event.end = value;
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
    }
  }
  if (recurrenceId && event.uid) {
    event.uid = `${event.uid}/${recurrenceId}`;
  }

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
  const tzid = event.timezone ?? "UTC"; // Fallback to UTC if no timezone provided

  const vevent: any[] = [
    "vevent",
    [
      ["uid", {}, "text", event.uid],
      ["transp", {}, "text", event.transp ?? "OPAQUE"],
      [
        "dtstart",
        { tzid },
        "date-time",
        event.start.toISOString().split(".")[0],
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
    vevent[1].push([
      "dtend",
      { tzid },
      "date-time",
      event.start.toISOString().split(".")[0],
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

  event.attendee.forEach((att) => {
    vevent[1].push([
      "attendee",
      {
        cn: att.cn,
        partstat: att.partstat,
        rsvp: att.rsvp,
        role: att.role,
        cutype: att.cutype,
      },
      "cal-address",
      `mailto:${att.cal_address}`,
    ]);
  });

  const vtimezone: any[] = ["vtimezone", [["tzid", {}, "text", tzid]], []];

  return ["vcalendar", [], [vevent, vtimezone]];
}

function formatDateToICal(date: Date, tz?: string) {
  // Format date like: 20250214T110000 (local time)
  // If tz is provided, use TZID param in DTSTART/DTEND
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

export function calendarEventToICal(
  cal: Calendars,
  event: CalendarEvent
): string {
  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Sabre//Sabre VObject 4.1.3//EN");
  if (cal.calscale) lines.push(`CALSCALE:${cal.calscale}`);
  if (cal.version) lines.push(`VERSION:${cal.version}`);

  lines.push(TIMEZONES.zones[event.timezone].ics);
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${event.uid}`);

  if (event.transp) lines.push(`TRANSP:${event.transp.toUpperCase()}`);
  if (event.start)
    lines.push(
      `DTSTART${event.timezone ? `;TZID=${event.timezone}` : ""}:` +
        formatDateToICal(event.start)
    );
  if (event.end)
    lines.push(
      `DTEND${event.timezone ? `;TZID=${event.timezone}` : ""}:` +
        formatDateToICal(event.end)
    );
  lines.push(`DTSTAMP:${ICAL.Time.now().toICALString()}`);

  if (event.class) lines.push(`CLASS:${event.class.toUpperCase()}`);
  if (event.x_openpass_videoconference !== undefined)
    lines.push(
      `X-OPENPAAS-VIDEOCONFERENCE:${event.x_openpass_videoconference || ""}`
    );
  if (event.title) lines.push(`SUMMARY:${event.title}`);
  if (event.description) lines.push(`DESCRIPTION:${event.description}`);
  if (event.location) lines.push(`LOCATION:${event.location}`);

  if (event.organizer) {
    lines.push(
      `ORGANIZER;CN=${event.organizer.cn}:${event.organizer.cal_address}`
    );
  }

  event.attendee.forEach((att) => {
    lines.push(
      `ATTENDEE;PARTSTAT=${att.partstat};RSVP=${att.rsvp};ROLE=${att.role};CUTYPE=${att.cutype};CN=${att.cn}:${att.cal_address}`
    );
  });

  if (event.stamp) lines.push(`DTSTAMP:${formatDateToICal(event.stamp)}Z`);
  if (event.sequence !== undefined) lines.push(`SEQUENCE:${event.sequence}`);

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR\n");
  console.debug(lines.join("\r\n"));
  return lines.join("\r\n");
}
