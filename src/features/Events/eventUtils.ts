import { userAttendee } from "../User/userDataTypes";
import { CalendarEvent } from "./EventsTypes";

type RawEntry = [string, Record<string, string>, string, any];

export function parseCalendarEvent(
  data: RawEntry[],
  color: string
): CalendarEvent {
  const event: Partial<CalendarEvent> = { color, attendee: [] };

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
          cn: params?.cn || "",
          cal_address: value.replace(/^mailto:/, ""),
        };
        break;
      case "attendee":
        (event.attendee as userAttendee[]).push({
          cn: params?.cn || "",
          cal_address: value.replace(/^mailto:/, ""),
          partstat: params?.partstat || "",
          rsvp: params?.rsvp || "",
          role: params?.role || "",
          cutype: params?.cutype || "",
        });
        break;
      case "dtstamp":
        event.stamp = new Date(value);
        break;
      case "sequence":
        event.sequence = Number(value);
        break;
    }
  }

  if (!event.uid || !event.start) {
    console.log(event);
    throw new Error(`Missing required event fields`);
  }

  return event as CalendarEvent;
}
