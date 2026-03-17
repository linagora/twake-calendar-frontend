import moment from "moment-timezone";
import { CalendarEvent, RepetitionObject } from "../EventsTypes";
import { normalizeRepetition } from "./normalizeRepetition";

/**
 * Detect what changed in recurring event update
 */
export function detectRecurringEventChanges(
  oldEvent: CalendarEvent,
  newData: {
    repetition: RepetitionObject;
    timezone: string;
    allday: boolean;
    start: string;
    end: string;
  },
  masterEventData: CalendarEvent | null,
  resolveTimezone: (tz: string) => string
): {
  timeChanged: boolean;
  timezoneChanged: boolean;
  repetitionRulesChanged: boolean;
} {
  const oldTimezone = resolveTimezone(oldEvent.timezone || "UTC");
  const newTimezone = resolveTimezone(newData.timezone || "UTC");
  const timezoneChanged = oldTimezone !== newTimezone;

  // Use master event as the source of truth for the "old" times,
  // falling back to the clicked instance if master isn't available.
  const oldStart = masterEventData?.start || oldEvent.start;
  const oldEnd = masterEventData?.end || oldEvent.end;

  // Parse old times (ISO strings from the server) into the event's timezone
  // and extract HH:mm for comparison.
  const oldStartTime = moment.tz(oldStart, oldTimezone).format("HH:mm");
  const oldEndTime = moment.tz(oldEnd, oldTimezone).format("HH:mm");
  // Parse new times from the form. These may be either:
  //   - local datetime strings like "2025-01-15T10:00" (from the form)
  //   - ISO strings like "2025-01-15T10:00:00.000Z" (if pre-converted)
  // moment.tz with a format avoids ambiguous parsing in both cases.
  const newStartTime = moment.tz(newData.start, newTimezone).format("HH:mm");
  const newEndTime = moment.tz(newData.end, newTimezone).format("HH:mm");

  const timeChanged =
    oldStartTime !== newStartTime || oldEndTime !== newEndTime;

  const repetitionRulesChanged =
    JSON.stringify(normalizeRepetition(oldEvent.repetition)) !==
      JSON.stringify(normalizeRepetition(newData.repetition)) ||
    timezoneChanged ||
    oldEvent.allday !== newData.allday ||
    timeChanged;

  return {
    timeChanged,
    timezoneChanged,
    repetitionRulesChanged,
  };
}
