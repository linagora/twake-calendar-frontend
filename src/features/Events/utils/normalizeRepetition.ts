import { RepetitionObject } from "../EventsTypes";

/**
 * Normalize repetition object for accurate comparison
 */

export function normalizeRepetition(repetition: RepetitionObject | undefined): {
  freq: string;
  interval: number;
  byday: string[] | null;
  occurrences: number | null;
  endDate: string | null;
} | null {
  if (!repetition || !repetition.freq) return null;

  return {
    freq: repetition.freq,
    interval: repetition.interval || 1,
    byday:
      !repetition.byday || repetition.byday.length === 0
        ? null
        : [...repetition.byday].sort(),
    occurrences: repetition.occurrences || null,
    endDate: repetition.endDate || null,
  };
}
