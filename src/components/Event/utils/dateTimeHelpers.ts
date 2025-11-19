import moment from "moment-timezone";
import dayjs, { Dayjs } from "dayjs";

/**
 * Helper functions for date/time string manipulation
 */


export const DATETIME_WITH_SECONDS_LENGTH = 19;
export const DATETIME_FORMAT_WITH_SECONDS = "YYYY-MM-DDTHH:mm:ss";
export const DATETIME_FORMAT_WITHOUT_SECONDS = "YYYY-MM-DDTHH:mm";

/**
 * Detect datetime format based on string length
 * @param datetime - Datetime string to analyze
 * @returns Format string for moment parsing
 */
export function detectDateTimeFormat(datetime: string): string {
  return datetime.length >= DATETIME_WITH_SECONDS_LENGTH
    ? DATETIME_FORMAT_WITH_SECONDS
    : DATETIME_FORMAT_WITHOUT_SECONDS;
}

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

/**
 * Convert a local form datetime string to ISO string in a specific timezone
 * Assumes input format YYYY-MM-DDTHH:mm (24h)
 */
export function convertFormDateTimeToISO(
  datetime: string,
  timezone: string
): string {
  if (!datetime) return "";
  const tz = timezone || "Etc/UTC";
  const format = detectDateTimeFormat(datetime);
  const momentDate = moment.tz(datetime, format, tz);
  if (!momentDate.isValid()) {
    console.warn(
      `[convertFormDateTimeToISO] Invalid datetime: "${datetime}" with format "${format}" in timezone "${tz}"`
    );
    return "";
  }
  return momentDate.toDate().toISOString();
}

/** Convert date + time strings → Dayjs */
export const toDateTime = (date: string, time: string): Dayjs => {
  const d = dayjs(date, "YYYY-MM-DD", true);
  if (!time) return d.startOf("day");
  const [h, m] = time.split(":").map(Number);
  return d.hour(h).minute(m).second(0).millisecond(0);
};

/** Extract date “YYYY-MM-DD” */
export const dtDate = (d: Dayjs) => d.format("YYYY-MM-DD");

/** Extract time “HH:mm” */
export const dtTime = (d: Dayjs) => d.format("HH:mm");
