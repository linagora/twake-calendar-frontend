import { CalendarEvent } from "../../EventsTypes";

export function makeRecurrenceString(
  event: CalendarEvent,
  t: (k: string, p?: string | object) => string
): string | undefined {
  if (!event.repetition) return;

  const recur: string[] = [
    `${t("eventPreview.recurrentEvent")} · ${t(
      `eventPreview.freq.${event.repetition.freq}`,
      event.repetition.freq
    )}`,
  ];

  const recurType: Record<string, string> = {
    daily: t("event.repeat.frequency.days"),
    weekly: t("event.repeat.frequency.weeks"),
    monthly: t("event.repeat.frequency.months"),
    yearly: t("event.repeat.frequency.years"),
  };

  if (event.repetition.interval && event.repetition.interval > 1) {
    recur.push(
      t("eventPreview.everyInterval", {
        interval: event.repetition.interval,
        unit: recurType[event.repetition.freq] ?? event.repetition.freq,
      })
    );
  }

  if (event.repetition.byday) {
    recur.push(
      t("eventPreview.recurrenceOnDays", {
        days: event.repetition.byday
          .map((s) => t(`eventPreview.onDays.${s}`))
          .join(", "),
      })
    );
  }

  if (event.repetition.occurrences) {
    recur.push(
      t("eventPreview.forOccurrences", {
        count: event.repetition.occurrences,
      })
    );
  }
  if (event.repetition.endDate) {
    recur.push(
      t("eventPreview.until", {
        date: new Date(event.repetition.endDate).toLocaleDateString(
          t("locale"),
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        ),
      })
    );
  }
  return recur.join(", ");
}
