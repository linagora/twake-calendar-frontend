import { TIMEZONES } from "@/utils/timezone-data";
import { CalendarEvent } from "../EventsTypes";
import { makeVevent } from "./makeVevent";
import { makeTimezone } from "./makeTimezone";

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
