/**
 * Helper functions for date/time string manipulation
 */

/**
 * Split datetime string (YYYY-MM-DDTHH:mm) into date and time parts
 * @param datetime - ISO datetime string
 * @returns Object with date and time strings
 */
export function splitDateTime(datetime: string): {
  date: string;
  time: string;
} {
  if (!datetime) return { date: "", time: "" };
  const parts = datetime.split("T");
  return {
    date: parts[0] || "",
    time: parts[1]?.slice(0, 5) || "", // HH:mm only
  };
}

/**
 * Combine date and time strings into datetime string
 * @param date - Date string (YYYY-MM-DD)
 * @param time - Time string (HH:mm)
 * @returns Combined datetime string or date only if no time
 */
export function combineDateTime(date: string, time: string): string {
  if (!date) return "";
  if (!time) return date; // Date only for all-day
  return `${date}T${time}`;
}
