import { defaultColors } from "@/utils/defaultColors";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { parseCalendarEvent } from "@/features/Events/eventUtils";
import { CalDavItem } from "../api/types";
import { Calendar } from "../CalendarTypes";
import { VCalComponent } from "../types/CalendarData";

export function extractCalendarEvents(
  item: CalDavItem,
  options: {
    cal: Calendar;
    color?: Record<string, string>;
  }
): CalendarEvent[] {
  const data = item.data;
  if (!Array.isArray(data)) {
    return [];
  }

  // VEVENTS are at index 2
  const vevents = data[2];
  if (!Array.isArray(vevents)) {
    return [];
  }

  const eventURL = item._links?.self?.href;
  if (!eventURL) {
    return [];
  }

  return vevents
    .map((vevent) => {
      if (!Array.isArray(vevent)) {
        return null;
      }

      const eventProps = vevent[1];
      if (!Array.isArray(eventProps)) {
        return null;
      }

      const valarm = extractValarm(vevent);

      return parseCalendarEvent(
        eventProps,
        options?.color ?? defaultColors[0],
        options.cal,
        eventURL,
        valarm
      );
    })
    .filter(Boolean) as CalendarEvent[];
}

function extractValarm(vevent: VCalComponent[]) {
  const subComponents = vevent[2];
  if (!Array.isArray(subComponents)) {
    return undefined;
  }

  const valarmComponent = subComponents.find(
    (component) => Array.isArray(component) && component[0] === "valarm"
  );

  return valarmComponent;
}
