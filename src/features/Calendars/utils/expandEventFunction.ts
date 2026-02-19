import { reportEvent } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { formatDateToYYYYMMDDTHHMMSS } from "@/utils/dateUtils";
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
        cal: calendar,
        color: calendar.color,
      });
      return events;
    } catch (err) {
      console.error("Failed to fetch event", eventUrl, err);
      return undefined;
    }
  };
}
