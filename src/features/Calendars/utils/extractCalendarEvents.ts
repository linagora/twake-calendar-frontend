import { defaultColors } from "../../../components/Calendar/utils/calendarColorsUtils";
import { CalendarEvent } from "../../Events/EventsTypes";
import { parseCalendarEvent } from "../../Events/eventUtils";
import { CalDavItem } from "../api/types";

export function extractCalendarEvents(
  item: CalDavItem,
  options: {
    calId: string;
    color?: Record<string, string>;
  }
): CalendarEvent[] {
  const data = item.data;
  if (!Array.isArray(data)) {
    return [];
  }

  // According to CalDAV, VEVENTS is at index 2
  const vevents = data[2];
  if (!Array.isArray(vevents)) {
    return [];
  }

  const eventURL = item._links?.self?.href;
  if (!eventURL) {
    return [];
  }

  // VALARM is optional and deeply nested
  const valarm =
    Array.isArray(vevents[0]) && Array.isArray(vevents[0][2])
      ? vevents[0][2][0]
      : undefined;

  return vevents
    .map((vevent) => {
      if (!Array.isArray(vevent)) {
        return null;
      }

      const eventProps = vevent[1];
      if (!eventProps) {
        return null;
      }

      return parseCalendarEvent(
        eventProps,
        options?.color ?? defaultColors[0],
        options.calId,
        eventURL,
        valarm
      );
    })
    .filter(Boolean) as CalendarEvent[];
}
