import { formatDateToYYYYMMDDTHHMMSS } from "@/utils/dateUtils";
import { reportEvent } from "../../Events/EventApi";
import { CalendarEvent } from "../../Events/EventsTypes";
import { Calendar } from "../CalendarTypes";
import { extractCalendarEvents } from "./extractCalendarEvents";

export function expandEventFunction(
  calendarRange: { start: Date; end: Date },
  calendar: Calendar
): (item: string) => Promise<CalendarEvent[] | undefined> {
  return async (eventUrl) => {
    try {
      const item = await reportEvent({ URL: eventUrl } as CalendarEvent, {
        start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
        end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
      });
      const events: CalendarEvent[] = extractCalendarEvents(item, {
        calId: calendar.id,
        color: calendar.color,
      });
      return events;
    } catch (err) {
      console.error("Failed to fetch event", eventUrl);
      return undefined;
    }
  };
}
