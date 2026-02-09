import { getCalendarVisibility } from "@/components/Calendar/utils/calendarUtils";
import { CalendarData } from "../types/CalendarData";

export function normalizeCalendar(rawCalendar: CalendarData) {
  const description = rawCalendar["caldav:description"];
  let delegated = false;
  let source = rawCalendar["calendarserver:source"]
    ? rawCalendar["calendarserver:source"]._links.self?.href
    : rawCalendar._links.self?.href;
  const link = rawCalendar._links.self?.href;
  if (rawCalendar["calendarserver:delegatedsource"]) {
    source = rawCalendar["calendarserver:delegatedsource"];
    delegated = true;
  }
  if (!source) {
    throw new Error("No source for calendar");
  }
  const id = source.replace("/calendars/", "").replace(".json", "");
  const ownerId = id.split("/")[0];
  const visibility = getCalendarVisibility(rawCalendar["acl"] ?? []);
  return {
    cal: rawCalendar,
    description,
    delegated,
    source,
    link,
    id,
    ownerId,
    visibility,
  };
}
