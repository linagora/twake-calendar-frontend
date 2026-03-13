import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import { RepetitionRule } from "../../Calendars/types/CalendarData";
import { CalendarEvent } from "../EventsTypes";
import { formatDateToICal } from "./formatDateToICal";

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

  if (event.passthroughProps?.length) {
    const existingKeys = new Set(
      (vevent[1] as unknown[]).map((p) => (p as [string])[0].toLowerCase())
    );
    for (const prop of event.passthroughProps) {
      if (!existingKeys.has(prop[0].toLowerCase())) {
        vevent[1].push(prop);
      }
    }
  }

  return vevent;
}
