import { Calendar } from "../features/Calendars/CalendarTypes";

export function makeDisplayName(
  selectedCalendar: Calendar
): string | undefined {
  if (
    !selectedCalendar ||
    (!selectedCalendar.owner?.lastname && !selectedCalendar.owner?.firstname)
  )
    return;
  return [selectedCalendar.owner?.firstname, selectedCalendar.owner?.lastname]
    .filter(Boolean)
    .join(" ");
}
