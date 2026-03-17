import { Calendar } from "@/features/Calendars/CalendarTypes";

export function buildDelegatedEventURL(
  calendar: Calendar,
  eventURL: string
): string {
  if (!calendar.link || !calendar.link.endsWith(".json")) {
    throw new Error(`Invalid calendar link format: ${calendar.link}`);
  }
  const calendarBasePath = calendar.link.replace(/\.json$/, "");
  const eventFilename = eventURL.split("/").pop();
  if (!eventFilename) {
    throw new Error(`Cannot extract filename from event URL: ${eventURL}`);
  }
  return `${calendarBasePath}/${eventFilename}`;
}
