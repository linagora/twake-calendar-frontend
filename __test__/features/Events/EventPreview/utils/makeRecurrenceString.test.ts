import { makeRecurrenceString } from "@/features/Events/EventPreview/utils/makeRecurrenceString";
import { RepetitionObject } from "@/features/Events/EventsTypes";

describe("makeRecurrenceString", () => {
  const mockT = jest.fn((key: string, params?: any) => {
    if (params) {
      if (key === "eventPreview.everyInterval") {
        return `Every ${params.interval} ${params.unit}`;
      }
      if (key === "eventPreview.recurrenceOnDays") {
        return `on ${params.days}`;
      }
      if (key === "eventPreview.forOccurrences") {
        return `for ${params.count} times`;
      }
      if (key === "eventPreview.until") {
        return `until ${params.date}`;
      }
    }

    const translations: Record<string, string> = {
      "event.repeat.frequency.days": "days",
      "event.repeat.frequency.weeks": "weeks",
      "event.repeat.frequency.months": "months",
      "event.repeat.frequency.years": "years",
      "eventPreview.onDays.MO": "Monday",
      "eventPreview.onDays.TU": "Tuesday",
      "eventPreview.onDays.WE": "Wednesday",
      "eventPreview.onDays.TH": "Thursday",
      "eventPreview.onDays.FR": "Friday",
      "eventPreview.onDays.SA": "Saturday",
      "eventPreview.onDays.SU": "Sunday",
      locale: "en-US",
    };

    return translations[key] || key;
  });

  const startText = "Repeats";

  beforeEach(() => {
    mockT.mockClear();
  });

  it("formats string for interval === 1 when enableStrForOneTimeInterval is true", () => {
    const repetition: RepetitionObject = { freq: "daily", interval: 1 };
    const result = makeRecurrenceString({
      repetition,
      t: mockT,
      startText,
      enableStrForOneTimeInterval: true,
    });

    expect(result).toBe("Repeats, days");
  });

  it("formats string when interval is undefined", () => {
    const repetition: RepetitionObject = { freq: "daily" };
    const result = makeRecurrenceString({
      repetition,
      t: mockT,
      startText,
      enableStrForOneTimeInterval: true,
    });

    expect(result).toBe("Repeats, days");
  });

  it("formats string for interval > 1", () => {
    const repetition: RepetitionObject = { freq: "weekly", interval: 2 };
    const result = makeRecurrenceString({ repetition, t: mockT, startText });

    expect(result).toBe("Repeats, Every 2 weeks");
    expect(mockT).toHaveBeenCalledWith("eventPreview.everyInterval", {
      interval: 2,
      unit: "weeks",
    });
  });

  it("formats string with specific days and sorts them according to WEEK_DAYS order", () => {
    const repetition: RepetitionObject = {
      freq: "weekly",
      interval: 1,
      byday: ["WE", "MO", "FR"],
    };
    const result = makeRecurrenceString({ repetition, t: mockT, startText });

    // Expected order: MO, WE, FR
    expect(result).toBe("Repeats, on Monday, Wednesday, Friday");
  });

  it("formats string with occurrences count", () => {
    const repetition: RepetitionObject = {
      freq: "daily",
      interval: 1,
      occurrences: 5,
    };
    const result = makeRecurrenceString({ repetition, t: mockT, startText });

    expect(result).toBe("Repeats, for 5 times");
  });

  it("formats string with end date", () => {
    const endDate = "2025-12-31T00:00:00.000Z";
    const repetition: RepetitionObject = {
      freq: "daily",
      interval: 1,
      endDate,
    };
    const result = makeRecurrenceString({ repetition, t: mockT, startText });

    const formattedDate = new Date(endDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    expect(result).toBe(`Repeats, until ${formattedDate}`);
  });

  it("combines multiple properties", () => {
    const endDate = "2025-12-31T00:00:00.000Z";
    const repetition: RepetitionObject = {
      freq: "monthly",
      interval: 3,
      byday: ["TU", "TH"],
      endDate,
    };
    const result = makeRecurrenceString({ repetition, t: mockT, startText });

    const formattedDate = new Date(endDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    expect(result).toBe(
      `Repeats, Every 3 months, on Tuesday, Thursday, until ${formattedDate}`
    );
  });

  it("uses custom joinChar when provided", () => {
    const repetition: RepetitionObject = {
      freq: "weekly",
      interval: 2,
      occurrences: 10,
    };
    const result = makeRecurrenceString({
      repetition,
      t: mockT,
      startText,
      joinChar: ";",
    });

    expect(result).toBe("Repeats; Every 2 weeks; for 10 times");
  });
});
