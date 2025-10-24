/**
 * Date/time formatting utilities
 */

/**
 * Format a Date object to local datetime string (YYYY-MM-DDTHH:mm)
 * @param date - Date object to format
 * @param timeZone - Optional timezone for formatting
 * @returns Formatted datetime string
 */
export function formatLocalDateTime(date: Date, timeZone?: string): string {
  // Guard against invalid or undefined dates
  if (!date || isNaN(date.getTime())) {
    return "";
  }

  if (timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
    const formatted = formatter.format(date);
    return formatted.replace(", ", "T");
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Format an ISO datetime string in a specific timezone
 * @param isoString - ISO datetime string
 * @param timezone - Target timezone
 * @returns Formatted datetime string in target timezone
 */
export function formatDateTimeInTimezone(
  isoString: string,
  timezone: string
): string {
  // Parse the ISO string as UTC
  const utcDate = new Date(isoString);

  // Format the date in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const getValue = (type: string) =>
    parts.find((p) => p.type === type)?.value || "";

  return `${getValue("year")}-${getValue("month")}-${getValue("day")}T${getValue("hour")}:${getValue("minute")}`;
}

/**
 * Get current time rounded to nearest 30 minutes
 * @returns Rounded Date object
 */
export function getRoundedCurrentTime(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = minutes < 30 ? 0 : 30;
  now.setMinutes(roundedMinutes);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return now;
}
