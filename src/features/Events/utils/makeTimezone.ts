import { TIMEZONES } from "@/utils/timezone-data";
import ICAL from "ical.js";
import { CalendarEvent } from "../EventsTypes";

export function makeTimezone(
  timezoneData:
    | { ics: string; latitude: string; longitude: string }
    | undefined,
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
