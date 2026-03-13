import { Calendar } from "../../Calendars/CalendarTypes";

export function buildDelegatedEventURL(
  calendar: Calendar,
  eventURL: string
): string {
  const calendarBasePath = calendar.link.replace(/\.json$/, "");
  const eventFilename = eventURL.split("/").pop();
  if (!eventFilename) {
    throw new Error(`Cannot extract filename from event URL: ${eventURL}`);
  }
  return `${calendarBasePath}/${eventFilename}`;
}
