import moment from "moment-timezone";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Helper functions for date/time string manipulation
 */

export const DATETIME_WITH_SECONDS_LENGTH = 19;
export const DATETIME_FORMAT_WITH_SECONDS = "YYYY-MM-DDTHH:mm:ss";
export const DATETIME_FORMAT_WITHOUT_SECONDS = "YYYY-MM-DDTHH:mm";

export const TIME_PARSE_FORMATS = ["HH:mm", "H:mm", "HHmm", "Hmm", "HH", "H"];

// Strict parsing mode - input must exactly match the provided format(s)
const STRICT_PARSING = true;

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
  const d = dayjs(date, "YYYY-MM-DD", STRICT_PARSING);
  if (!time) return d.startOf("day");
  const [h, m] = time.split(":").map(Number);
  return d.hour(h).minute(m).second(0).millisecond(0);
};

/** Extract date “YYYY-MM-DD” */
export const dtDate = (d: Dayjs) => d.format("YYYY-MM-DD");

/** Extract time “HH:mm” */
export const dtTime = (d: Dayjs) => d.format("HH:mm");

/**
 * Parse flexible time string input into Dayjs object
 * Handles formats like: "HH:mm", "HHmm", "Hmm", "HH", "H"
 * Also handles 3-digit input normalization (e.g. "830" -> "08:30")
 */
export function parseTimeInput(
  value: string,
  currentDate: Dayjs | null
): Dayjs | null {
  let trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Normalize 3-digit input (e.g. "830" → "0830" → 08:30, "123" → "0123" → 01:23)
  if (/^\d{3}$/.test(trimmed)) {
    trimmed = trimmed.padStart(4, "0");
  }

  const parsed = dayjs(trimmed, TIME_PARSE_FORMATS, STRICT_PARSING);
  if (parsed.isValid()) {
    const baseDate = currentDate || dayjs();
    return baseDate
      .hour(parsed.hour())
      .minute(parsed.minute())
      .second(0)
      .millisecond(0);
  }

  return null;
}
