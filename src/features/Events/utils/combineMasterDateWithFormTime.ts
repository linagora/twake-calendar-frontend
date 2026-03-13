import { convertFormDateTimeToISO } from "@/components/Event/utils/dateTimeHelpers";
import { CalendarEvent } from "../EventsTypes";

/**
 * Combine master event's date with form input's time for recurring event updates
 * Preserves original start date while applying new time from user input
 */

export function combineMasterDateWithFormTime(
  masterEvent: CalendarEvent,
  formStart: string,
  formEnd: string,
  timezone: string,
  isAllDay: boolean,
  formatDateTimeInTimezone: (iso: string, tz: string) => string
): { startDate: string; endDate: string } {
  if (isAllDay) {
    // Extract date string from master event (which is ISO UTC string)
    const startDateStr = new Date(masterEvent.start)
      .toISOString()
      .split("T")[0];
    const endDateStr = masterEvent.end
      ? new Date(masterEvent.end).toISOString().split("T")[0]
      : startDateStr;

    // Parse date string and create Date at UTC midnight to avoid timezone offset issues
    const [startYear, startMonth, startDay] = startDateStr
      .split("-")
      .map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);
    const startDateObj = new Date(
      Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
    );
    const endDateObj = new Date(
      Date.UTC(endYear, endMonth - 1, endDay, 0, 0, 0, 0)
    );

    return {
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
    };
  }

  // For timed events: combine master's date with form's time
  const masterFormattedStart = formatDateTimeInTimezone(
    masterEvent.start,
    timezone
  );
  const masterFormattedEnd = masterEvent.end
    ? formatDateTimeInTimezone(masterEvent.end, timezone)
    : masterFormattedStart;

  // Extract date portion from master (YYYY-MM-DD)
  const masterDatePart = masterFormattedStart.split("T")[0];
  const masterEndDatePart = masterFormattedEnd.split("T")[0];

  // Extract time portion from form input (HH:MM or HH:MM:SS)
  const formTimePart = formStart.includes("T")
    ? formStart.split("T")[1]
    : formStart.substring(11);
  const formEndTimePart = formEnd.includes("T")
    ? formEnd.split("T")[1]
    : formEnd.substring(11);

  // Combine master's date + form's time
  const combinedStartStr = `${masterDatePart}T${formTimePart}`;
  const combinedEndStr = `${masterEndDatePart}T${formEndTimePart}`;

  // Parse and convert to ISO
  const startDate = convertFormDateTimeToISO(combinedStartStr, timezone);
  const endDate = convertFormDateTimeToISO(combinedEndStr, timezone);

  return { startDate, endDate };
}
