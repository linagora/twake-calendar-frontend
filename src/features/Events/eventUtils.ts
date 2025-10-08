import { userAttendee } from "../User/userDataTypes";
import { AlarmObject, CalendarEvent } from "./EventsTypes";
import ICAL from "ical.js";
import { TIMEZONES } from "../../utils/timezone-data";
type RawEntry = [string, Record<string, string>, string, any];

export function parseCalendarEvent(
  data: RawEntry[],
  color: string,
  calendarid: string,
  eventURL: string,
  valarm?: RawEntry[]
): CalendarEvent {
  const event: Partial<CalendarEvent> = { color, attendee: [] };
  let recurrenceId;
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  for (const [key, params, , value] of data) {
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
          cal_address: value?.replace(/^mailto:/i, ""),
        };
        break;
      case "attendee":
        (event.attendee as userAttendee[]).push({
          cn: params?.cn ?? "",
          cal_address: value.replace(/^mailto:/i, ""),
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
      case "exdate":
        if (!event.exdates) event.exdates = [];
        event.exdates.push(value);
        break;
      case "status":
        event.status = String(value);
        break;
      case "rrule":
        event.repetition = { freq: value.freq.toLowerCase() };
        if (value.byday) {
          event.repetition.byday = value.byday;
        }
        if (value.until) {
          event.repetition.endDate = value.until;
        }
        if (value.count) {
          event.repetition.occurrences = value.count;
        }
        if (value.interval) {
          event.repetition.interval = value.interval;
        }
        break;
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
          event.alarm.action = value;
          break;
        case "trigger":
          event.alarm.trigger = value;
          break;
      }
    }
  }

  event.URL = eventURL;
  if (!event.uid || !event.start || !event.end) {
    console.error(
      `missing crucial event param in calendar ${calendarid} `,
      data
    );
    event.error = `missing crucial event param in calendar ${calendarid} `;
    if (!event.end) {
      const start = event.start ? new Date(event.start) : new Date();
      const artificialEnd = new Date(start.getTime() + 3600000);
      event.end = formatDateToICal(artificialEnd, false);
    }
  }

  return event as CalendarEvent;
}

export function calendarEventToJCal(
  event: CalendarEvent,
  calOwnerEmail?: string
): any[] {
  const tzid = event.timezone; // Fallback to UTC if no timezone provided

  const vevent: any[] = makeVevent(event, tzid, calOwnerEmail);

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
      ["dstamp", { tzid }, "date-time", formatDateToICal(new Date(), false)],
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
  vevent.push([]);

  if (event.end) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    let finalEndDate = endDate;

    if (event.allday && endDate.getTime() === startDate.getTime()) {
      finalEndDate = new Date(endDate);
      finalEndDate.setDate(startDate.getDate() + 1);
    }

    vevent[1].push([
      "dtend",
      { tzid },
      event.allday ? "date" : "date-time",
      formatDateToICal(finalEndDate, event.allday ?? false),
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
    if (
      event.repetition.byday !== null &&
      event.repetition.byday !== undefined
    ) {
      repetitionRule["byday"] = event.repetition.byday;
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
        formatDateToICal(new Date(ex), false),
      ]);
    });
  }

  return vevent;
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
