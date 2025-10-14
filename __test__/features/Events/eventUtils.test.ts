import {
  CalendarEvent,
  RepetitionObject,
} from "../../../src/features/Events/EventsTypes";
import {
  calendarEventToJCal,
  parseCalendarEvent,
  combineMasterDateWithFormTime,
  normalizeRepetition,
  normalizeTimezone,
  detectRecurringEventChanges,
} from "../../../src/features/Events/eventUtils";
import { TIMEZONES } from "../../../src/utils/timezone-data";

describe("parseCalendarEvent", () => {
  const baseColor = "#00FF00";
  const calendarId = "calendar-123";

  it("parses a full event with MAILTO in caps correctly", () => {
    const rawData = [
      ["UID", {}, "text", "event-1"],
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
      ["DTEND", {}, "date-time", "2025-07-18T10:00:00Z"],
      ["SUMMARY", {}, "text", "Team Meeting"],
      ["DESCRIPTION", {}, "text", "Discuss roadmap"],
      ["LOCATION", {}, "text", "Zoom"],
      ["ORGANIZER", { cn: "Alice" }, "cal-address", "alice@example.com"],
      [
        "ATTENDEE",
        { cn: "Bob", partstat: "ACCEPTED" },
        "cal-address",
        "bob@example.com",
      ],
      ["X-OPENPAAS-VIDEOCONFERENCE", {}, "text", "https://meet.link"],
      ["STATUS", {}, "text", "CONFIRMED"],
      ["SEQUENCE", {}, "integer", "2"],
      ["TRANSP", {}, "text", "OPAQUE"],
      ["CLASS", {}, "text", "PUBLIC"],
      ["DTSTAMP", {}, "date-time", "2025-07-18T08:00:00Z"],
    ] as unknown as [string, Record<string, string>, string, any];

    const result = parseCalendarEvent(
      rawData,
      baseColor,
      calendarId,
      "/calendars/test.ics"
    );

    expect(result.uid).toBe("event-1");
    expect(result.title).toBe("Team Meeting");
    expect(result.description).toBe("Discuss roadmap");
    expect(result.location).toBe("Zoom");
    expect(result.start).toBe("2025-07-18T09:00:00Z");
    expect(result.end).toBe("2025-07-18T10:00:00Z");
    expect(result.stamp).toBe("2025-07-18T08:00:00Z");
    expect(result.sequence).toBe(2);
    expect(result.color).toBe(baseColor);
    expect(result.status).toBe("CONFIRMED");
    expect(result.transp).toBe("OPAQUE");
    expect(result.class).toBe("PUBLIC");
    expect(result.x_openpass_videoconference).toBe("https://meet.link");

    expect(result.organizer).toEqual({
      cn: "Alice",
      cal_address: "alice@example.com",
    });

    expect(result.attendee).toEqual([
      {
        cn: "Bob",
        cal_address: "bob@example.com",
        partstat: "ACCEPTED",
        rsvp: "",
        role: "",
        cutype: "",
      },
    ]);
  });

  it("parses a full event correctly", () => {
    const rawData = [
      ["UID", {}, "text", "event-1"],
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
      ["DTEND", {}, "date-time", "2025-07-18T10:00:00Z"],
      ["SUMMARY", {}, "text", "Team Meeting"],
      ["DESCRIPTION", {}, "text", "Discuss roadmap"],
      ["LOCATION", {}, "text", "Zoom"],
      ["ORGANIZER", { cn: "Alice" }, "cal-address", "MAILTO:alice@example.com"],
      [
        "ATTENDEE",
        { cn: "Bob", partstat: "ACCEPTED" },
        "cal-address",
        "MAILTO:bob@example.com",
      ],
      ["X-OPENPAAS-VIDEOCONFERENCE", {}, "text", "https://meet.link"],
      ["STATUS", {}, "text", "CONFIRMED"],
      ["SEQUENCE", {}, "integer", "2"],
      ["TRANSP", {}, "text", "OPAQUE"],
      ["CLASS", {}, "text", "PUBLIC"],
      ["DTSTAMP", {}, "date-time", "2025-07-18T08:00:00Z"],
    ] as unknown as [string, Record<string, string>, string, any];

    const result = parseCalendarEvent(
      rawData,
      baseColor,
      calendarId,
      "/calendars/test.ics"
    );

    expect(result.uid).toBe("event-1");
    expect(result.title).toBe("Team Meeting");
    expect(result.description).toBe("Discuss roadmap");
    expect(result.location).toBe("Zoom");
    expect(result.start).toBe("2025-07-18T09:00:00Z");
    expect(result.end).toBe("2025-07-18T10:00:00Z");
    expect(result.stamp).toBe("2025-07-18T08:00:00Z");
    expect(result.sequence).toBe(2);
    expect(result.color).toBe(baseColor);
    expect(result.status).toBe("CONFIRMED");
    expect(result.transp).toBe("OPAQUE");
    expect(result.class).toBe("PUBLIC");
    expect(result.x_openpass_videoconference).toBe("https://meet.link");

    expect(result.organizer).toEqual({
      cn: "Alice",
      cal_address: "alice@example.com",
    });

    expect(result.attendee).toEqual([
      {
        cn: "Bob",
        cal_address: "bob@example.com",
        partstat: "ACCEPTED",
        rsvp: "",
        role: "",
        cutype: "",
      },
    ]);
  });

  it("marks allday true for DATE format", () => {
    const rawData = [
      ["UID", {}, "text", "event-2"],
      ["DTSTART", {}, "date", "2025-07-20"],
      ["DTEND", {}, "date", "2025-07-21"],
    ] as any;

    const result = parseCalendarEvent(
      rawData,
      baseColor,
      calendarId,
      "/calendars/test.ics"
    );

    expect(result.allday).toBe(true);
  });

  it("appends recurrence-id to UID if present", () => {
    const rawData: any = [
      ["UID", {}, "text", "event-2"],
      ["RECURRENCE-ID", {}, "date-time", "2025-07-18T09:00:00Z"],
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
    ];

    const result = parseCalendarEvent(
      rawData,
      baseColor,
      calendarId,
      "/calendars/test.ics"
    );

    expect(result.uid).toBe("event-2/2025-07-18T09:00:00Z");
  });

  it("returns error if UID or start is missing", () => {
    const rawDataMissingUid: any = [
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
    ];

    const result = parseCalendarEvent(
      rawDataMissingUid,
      baseColor,
      calendarId,
      "/calendars/test.ics"
    );
    expect(result.error).toMatch(/missing crucial event param/);

    const rawDataMissingStart: any = [["UID", {}, "text", "event-3"]];

    const result2 = parseCalendarEvent(
      rawDataMissingStart,
      baseColor,
      calendarId,
      "/calendars/test.ics"
    );
    expect(result2.error).toMatch(/missing crucial event param/);
  });

  it("returns computed end when there is no end but a duration", () => {
    jest.useFakeTimers().setSystemTime(new Date("2025-07-18T00:00:00Z"));

    const rawDataMissing: any = [
      ["UID", {}, "text", "event-1"],
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00"],
      ["duration", {}, "duration", "PT60M"],
    ];

    const result = parseCalendarEvent(
      rawDataMissing,
      baseColor,
      calendarId,
      "/calendars/test.ics"
    );
    expect(result.end).toBe("2025-07-18T10:00:00");
  });

  it("returns error if end and duration is missing", () => {
    const rawDataMissing: any = [
      ["UID", {}, "text", "event-1"],
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
    ];

    const result = parseCalendarEvent(
      rawDataMissing,
      baseColor,
      calendarId,
      "/calendars/test.ics"
    );
    expect(result.error).toMatch(/missing crucial event param/);
  });

  it("parses alarm block correctly", () => {
    const rawData = [
      ["UID", {}, "text", "event-5"],
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
    ] as any;

    const valarm: any = [
      "VALARM",
      [
        ["ACTION", {}, "text", "DISPLAY"],
        ["TRIGGER", {}, "duration", "-PT15M"],
      ],
    ];

    const result = parseCalendarEvent(
      rawData,
      baseColor,
      calendarId,
      "/calendars/test.ics",
      valarm
    );

    expect(result.alarm?.action).toBe("DISPLAY");
    expect(result.alarm?.trigger).toBe("-PT15M");
  });

  it("handles optional organizer and attendee fields gracefully", () => {
    const rawData = [
      ["UID", {}, "text", "event-4"],
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
      ["ATTENDEE", {}, "cal-address", "john@example.com"],
      ["ORGANIZER", {}, "cal-address", "jane@example.com"],
    ] as unknown as [string, Record<string, string>, string, any];

    const result = parseCalendarEvent(
      rawData,
      baseColor,
      calendarId,
      "/calendars/test.ics"
    );

    expect(result.attendee).toEqual([
      {
        cn: "",
        cal_address: "john@example.com",
        partstat: "",
        rsvp: "",
        role: "",
        cutype: "",
      },
    ]);

    expect(result.organizer).toEqual({
      cn: "",
      cal_address: "jane@example.com",
    });
  });
});

describe("calendarEventToJCal", () => {
  beforeAll(() => {
    jest.mock("ical.js", () => ({
      Timezone: jest.fn().mockImplementation(({ component, tzid }) => ({
        component: {
          jCal: [`vtimezone`, [], [["tzid", {}, "text", tzid]]],
        },
      })),
    }));
  });
  it("should convert a CalendarEvent to JCal format", () => {
    const mockEvent = {
      uid: "event-123",
      URL: "/calendars/test.ics",
      calId: "test/test",
      title: "Team Meeting",
      start: new Date("2025-07-23T10:00:00"),
      end: new Date("2025-07-23T11:00:00"),
      timezone: "Europe/Paris",
      transp: "OPAQUE",
      class: "PUBLIC",
      allday: false,
      location: "Room 101",
      description: "Discuss project roadmap.",
      repetition: { freq: "WEEKLY" },
      organizer: {
        cn: "Alice",
        cal_address: "alice@example.com",
      },
      attendee: [
        {
          cn: "Bob",
          partstat: "ACCEPTED",
          rsvp: "TRUE",
          role: "REQ-PARTICIPANT",
          cutype: "INDIVIDUAL",
          cal_address: "bob@example.com",
        },
      ],
    };

    const result = calendarEventToJCal(mockEvent as unknown as CalendarEvent);

    expect(result[0]).toBe("vcalendar");
    const [vevent, vtimezone] = result[2];
    expect(vevent[0]).toBe("vevent");

    const props = vevent[1];
    expect(props).toEqual(
      expect.arrayContaining([
        ["uid", {}, "text", "event-123"],
        ["summary", {}, "text", "Team Meeting"],
        ["transp", {}, "text", "OPAQUE"],
        [
          "dtstart",
          { tzid: "Europe/Paris" },
          "date-time",
          "2025-07-23T10:00:00",
        ],
        ["dtend", { tzid: "Europe/Paris" }, "date-time", "2025-07-23T11:00:00"],
        ["class", {}, "text", "PUBLIC"],
        ["location", {}, "text", "Room 101"],
        ["description", {}, "text", "Discuss project roadmap."],
        ["x-openpaas-videoconference", {}, "unknown", null],
        ["rrule", {}, "recur", { freq: "WEEKLY" }],
        [
          "organizer",
          { cn: "Alice" },
          "cal-address",
          "mailto:alice@example.com",
        ],
        [
          "attendee",
          {
            cn: "Bob",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          "cal-address",
          "mailto:bob@example.com",
        ],
      ])
    );
    expect(vtimezone[0]).toBe("vtimezone");
    expect(vtimezone[2]).toEqual(
      expect.arrayContaining([
        [
          "daylight",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+01:00"],
            ["tzoffsetto", {}, "utc-offset", "+02:00"],
            ["tzname", {}, "text", "CEST"],
            ["dtstart", {}, "date-time", "1970-03-29T02:00:00"],
            [
              "rrule",
              {},
              "recur",
              { byday: "-1SU", bymonth: 3, freq: "YEARLY" },
            ],
          ],
          [],
        ],
        [
          "standard",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+02:00"],
            ["tzoffsetto", {}, "utc-offset", "+01:00"],
            ["tzname", {}, "text", "CET"],
            ["dtstart", {}, "date-time", "1970-10-25T03:00:00"],
            [
              "rrule",
              {},
              "recur",
              { byday: "-1SU", bymonth: 10, freq: "YEARLY" },
            ],
          ],
          [],
        ],
      ])
    );
  });

  it("converts with alarm included", () => {
    const mockEvent: any = {
      uid: "event-10",
      title: "Alarm Event",
      start: new Date("2025-07-20T09:00:00"),
      end: new Date("2025-07-20T10:00:00"),
      timezone: "Europe/Paris",
      allday: false,
      alarm: { trigger: "-PT10M", action: "DISPLAY" },
      attendee: [],
    };

    const result = calendarEventToJCal(mockEvent, "owner@example.com");
    const vevent = result[2][0];

    expect(vevent[2][0][0]).toBe("valarm");
    expect(vevent[2][0][1]).toEqual(
      expect.arrayContaining([
        ["trigger", {}, "duration", "-PT10M"],
        ["action", {}, "text", "DISPLAY"],
      ])
    );
  });

  it("converts all-day events adjusting dtend", () => {
    const mockEvent: any = {
      uid: "event-11",
      title: "All Day",
      start: new Date("2025-07-21"),
      end: new Date("2025-07-21"),
      timezone: "Europe/Paris",
      allday: true,
      attendee: [],
    };

    const result = calendarEventToJCal(mockEvent);
    const veventProps = result[2][0][1];

    expect(veventProps).toEqual(
      expect.arrayContaining([
        ["dtstart", { tzid: "Europe/Paris" }, "date", "2025-07-21"],
        ["dtend", { tzid: "Europe/Paris" }, "date", "2025-07-22"],
      ])
    );
  });

  it("should convert a CalendarEvent to JCal format, with all day activated", () => {
    const mockEvent = {
      uid: "event-123",
      URL: "/calendars/test.ics",
      calId: "test/test",
      title: "Team Meeting",
      start: new Date("2025-07-23"),
      end: new Date("2025-07-23"),
      timezone: "Europe/Paris",
      transp: "OPAQUE",
      class: "PUBLIC",
      allday: true,
      location: "Room 101",
      description: "Discuss project roadmap.",
      repetition: { freq: "WEEKLY", interval: 2 },
      organizer: {
        cn: "Alice",
        cal_address: "alice@example.com",
      },
      attendee: [
        {
          cn: "Bob",
          partstat: "ACCEPTED",
          rsvp: "TRUE",
          role: "REQ-PARTICIPANT",
          cutype: "INDIVIDUAL",
          cal_address: "bob@example.com",
        },
      ],
    };

    const result = calendarEventToJCal(mockEvent as unknown as CalendarEvent);

    expect(result[0]).toBe("vcalendar");
    const [vevent, vtimezone] = result[2];
    expect(vevent[0]).toBe("vevent");

    const props = vevent[1];
    expect(props).toEqual(
      expect.arrayContaining([
        ["uid", {}, "text", "event-123"],
        ["summary", {}, "text", "Team Meeting"],
        ["transp", {}, "text", "OPAQUE"],
        ["dtstart", { tzid: "Europe/Paris" }, "date", "2025-07-23"],
        ["dtend", { tzid: "Europe/Paris" }, "date", "2025-07-24"],
        ["class", {}, "text", "PUBLIC"],
        ["location", {}, "text", "Room 101"],
        ["description", {}, "text", "Discuss project roadmap."],
        ["x-openpaas-videoconference", {}, "unknown", null],
        ["rrule", {}, "recur", { freq: "WEEKLY", interval: 2 }],
        [
          "organizer",
          { cn: "Alice" },
          "cal-address",
          "mailto:alice@example.com",
        ],
        [
          "attendee",
          {
            cn: "Bob",
            partstat: "ACCEPTED",
            rsvp: "TRUE",
            role: "REQ-PARTICIPANT",
            cutype: "INDIVIDUAL",
          },
          "cal-address",
          "mailto:bob@example.com",
        ],
      ])
    );
    expect(vtimezone[0]).toBe("vtimezone");
    expect(vtimezone[2]).toEqual(
      expect.arrayContaining([
        [
          "daylight",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+01:00"],
            ["tzoffsetto", {}, "utc-offset", "+02:00"],
            ["tzname", {}, "text", "CEST"],
            ["dtstart", {}, "date-time", "1970-03-29T02:00:00"],
            [
              "rrule",
              {},
              "recur",
              { byday: "-1SU", bymonth: 3, freq: "YEARLY" },
            ],
          ],
          [],
        ],
        [
          "standard",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+02:00"],
            ["tzoffsetto", {}, "utc-offset", "+01:00"],
            ["tzname", {}, "text", "CET"],
            ["dtstart", {}, "date-time", "1970-10-25T03:00:00"],
            [
              "rrule",
              {},
              "recur",
              { byday: "-1SU", bymonth: 10, freq: "YEARLY" },
            ],
          ],
          [],
        ],
      ])
    );
  });

  // Edge cases for timezone fallback
  it("handles invalid timezone with UTC fallback", () => {
    const mockEvent = {
      uid: "event-invalid-tz",
      title: "Invalid Timezone Event",
      start: new Date("2025-07-23T10:00:00"),
      end: new Date("2025-07-23T11:00:00"),
      timezone: "Invalid/Timezone",
      allday: false,
      attendee: [],
    };

    const result = calendarEventToJCal(mockEvent as unknown as CalendarEvent);

    expect(result[0]).toBe("vcalendar");
    const [vevent, vtimezone] = result[2];
    expect(vevent[0]).toBe("vevent");
    expect(vtimezone[0]).toBe("vtimezone");

    // Should use UTC timezone as fallback - check for UTC standard timezone
    expect(vtimezone[2]).toEqual(
      expect.arrayContaining([
        [
          "standard",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+00:00"],
            ["tzoffsetto", {}, "utc-offset", "+00:00"],
            ["tzname", {}, "text", "UTC"],
            ["dtstart", {}, "date-time", "1970-01-01T00:00:00"],
          ],
          [],
        ],
      ])
    );
  });

  it("handles null timezone with UTC fallback", () => {
    const mockEvent = {
      uid: "event-null-tz",
      title: "Null Timezone Event",
      start: new Date("2025-07-23T10:00:00"),
      end: new Date("2025-07-23T11:00:00"),
      timezone: null,
      allday: false,
      attendee: [],
    };

    const result = calendarEventToJCal(mockEvent as unknown as CalendarEvent);

    expect(result[0]).toBe("vcalendar");
    const [vevent, vtimezone] = result[2];
    expect(vevent[0]).toBe("vevent");
    expect(vtimezone[0]).toBe("vtimezone");

    // Should use UTC timezone as fallback
    expect(vtimezone[2]).toEqual(
      expect.arrayContaining([
        [
          "standard",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+00:00"],
            ["tzoffsetto", {}, "utc-offset", "+00:00"],
            ["tzname", {}, "text", "UTC"],
            ["dtstart", {}, "date-time", "1970-01-01T00:00:00"],
          ],
          [],
        ],
      ])
    );
  });

  it("handles undefined timezone with UTC fallback", () => {
    const mockEvent = {
      uid: "event-undefined-tz",
      title: "Undefined Timezone Event",
      start: new Date("2025-07-23T10:00:00"),
      end: new Date("2025-07-23T11:00:00"),
      timezone: undefined,
      allday: false,
      attendee: [],
    };

    const result = calendarEventToJCal(mockEvent as unknown as CalendarEvent);

    expect(result[0]).toBe("vcalendar");
    const [vevent, vtimezone] = result[2];
    expect(vevent[0]).toBe("vevent");
    expect(vtimezone[0]).toBe("vtimezone");

    // Should use UTC timezone as fallback
    expect(vtimezone[2]).toEqual(
      expect.arrayContaining([
        [
          "standard",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+00:00"],
            ["tzoffsetto", {}, "utc-offset", "+00:00"],
            ["tzname", {}, "text", "UTC"],
            ["dtstart", {}, "date-time", "1970-01-01T00:00:00"],
          ],
          [],
        ],
      ])
    );
  });

  it("handles empty string timezone with UTC fallback", () => {
    const mockEvent = {
      uid: "event-empty-tz",
      title: "Empty Timezone Event",
      start: new Date("2025-07-23T10:00:00"),
      end: new Date("2025-07-23T11:00:00"),
      timezone: "",
      allday: false,
      attendee: [],
    };

    const result = calendarEventToJCal(mockEvent as unknown as CalendarEvent);

    expect(result[0]).toBe("vcalendar");
    const [vevent, vtimezone] = result[2];
    expect(vevent[0]).toBe("vevent");
    expect(vtimezone[0]).toBe("vtimezone");

    // Should use UTC timezone as fallback
    expect(vtimezone[2]).toEqual(
      expect.arrayContaining([
        [
          "standard",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+00:00"],
            ["tzoffsetto", {}, "utc-offset", "+00:00"],
            ["tzname", {}, "text", "UTC"],
            ["dtstart", {}, "date-time", "1970-01-01T00:00:00"],
          ],
          [],
        ],
      ])
    );
  });

  it("handles valid timezone correctly", () => {
    const mockEvent = {
      uid: "event-valid-tz",
      title: "Valid Timezone Event",
      start: new Date("2025-07-23T10:00:00"),
      end: new Date("2025-07-23T11:00:00"),
      timezone: "Europe/Paris",
      allday: false,
      attendee: [],
    };

    const result = calendarEventToJCal(mockEvent as unknown as CalendarEvent);

    expect(result[0]).toBe("vcalendar");
    const [vevent, vtimezone] = result[2];
    expect(vevent[0]).toBe("vevent");
    expect(vtimezone[0]).toBe("vtimezone");

    // Should use the specified timezone - check for Europe/Paris timezone components
    expect(vtimezone[2]).toEqual(
      expect.arrayContaining([
        [
          "daylight",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+01:00"],
            ["tzoffsetto", {}, "utc-offset", "+02:00"],
            ["tzname", {}, "text", "CEST"],
            ["dtstart", {}, "date-time", "1970-03-29T02:00:00"],
            [
              "rrule",
              {},
              "recur",
              { byday: "-1SU", bymonth: 3, freq: "YEARLY" },
            ],
          ],
          [],
        ],
        [
          "standard",
          [
            ["tzoffsetfrom", {}, "utc-offset", "+02:00"],
            ["tzoffsetto", {}, "utc-offset", "+01:00"],
            ["tzname", {}, "text", "CET"],
            ["dtstart", {}, "date-time", "1970-10-25T03:00:00"],
            [
              "rrule",
              {},
              "recur",
              { byday: "-1SU", bymonth: 10, freq: "YEARLY" },
            ],
          ],
          [],
        ],
      ])
    );
  });
});

describe("combineMasterDateWithFormTime", () => {
  const mockFormatDateTime = (iso: string, tz: string) => {
    const date = new Date(iso);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  it("should use master event dates for all-day events", () => {
    const masterEvent = {
      start: "2025-10-14T07:00:00.000Z",
      end: "2025-10-14T08:00:00.000Z",
    } as CalendarEvent;

    const result = combineMasterDateWithFormTime(
      masterEvent,
      "2025-10-15T09:00",
      "2025-10-15T10:00",
      "UTC",
      true,
      mockFormatDateTime
    );

    expect(result.startDate).toBe("2025-10-14");
    expect(result.endDate).toBe("2025-10-14");
  });

  it("should handle all-day events with missing end date", () => {
    const masterEvent = {
      start: "2025-10-14T07:00:00.000Z",
      end: undefined,
    } as CalendarEvent;

    const result = combineMasterDateWithFormTime(
      masterEvent,
      "2025-10-15T09:00",
      "2025-10-15T10:00",
      "UTC",
      true,
      mockFormatDateTime
    );

    expect(result.startDate).toBe("2025-10-14");
    expect(result.endDate).toBe("2025-10-14");
  });

  it("should combine master date with form time for timed events", () => {
    const masterEvent = {
      start: "2025-10-14T07:00:00.000Z",
      end: "2025-10-14T08:00:00.000Z",
    } as CalendarEvent;

    const result = combineMasterDateWithFormTime(
      masterEvent,
      "2025-10-15T09:00",
      "2025-10-15T10:00",
      "UTC",
      false,
      mockFormatDateTime
    );

    const resultStartDate = new Date(result.startDate);
    expect(resultStartDate.getUTCDate()).toBe(14); // Monday (master's date)
    expect(resultStartDate.getUTCHours()).toBe(9); // 9am (form's time)
  });

  it("should preserve timezone when combining date and time", () => {
    const masterEvent = {
      start: "2025-10-14T00:00:00.000Z",
      end: "2025-10-14T01:00:00.000Z",
    } as CalendarEvent;

    const result = combineMasterDateWithFormTime(
      masterEvent,
      "2025-10-15T14:30",
      "2025-10-15T15:30",
      "Asia/Ho_Chi_Minh",
      false,
      mockFormatDateTime
    );

    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });

  it("should handle timed events with missing end date", () => {
    const masterEvent = {
      start: "2025-10-14T07:00:00.000Z",
      end: undefined,
    } as CalendarEvent;

    const result = combineMasterDateWithFormTime(
      masterEvent,
      "2025-10-15T09:00",
      "2025-10-15T10:00",
      "UTC",
      false,
      mockFormatDateTime
    );

    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });

  it("should handle different date formats from form input", () => {
    const masterEvent = {
      start: "2025-10-14T07:00:00.000Z",
      end: "2025-10-14T08:00:00.000Z",
    } as CalendarEvent;

    // Test with different time format
    const result = combineMasterDateWithFormTime(
      masterEvent,
      "2025-10-15 09:00:00",
      "2025-10-15 10:00:00",
      "UTC",
      false,
      mockFormatDateTime
    );

    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });
});

describe("normalizeRepetition", () => {
  it("should normalize repetition with all fields", () => {
    const repetition: RepetitionObject = {
      freq: "weekly",
      interval: 2,
      byday: ["MO", "WE", "FR"],
      occurrences: 10,
      endDate: "2025-12-31",
    };

    const result = normalizeRepetition(repetition);

    expect(result).toEqual({
      freq: "weekly",
      interval: 2,
      byday: ["FR", "MO", "WE"], // Sorted
      occurrences: 10,
      endDate: "2025-12-31",
    });
  });

  it("should return null for empty repetition", () => {
    expect(normalizeRepetition(undefined)).toBeNull();
    expect(normalizeRepetition({} as RepetitionObject)).toBeNull();
    expect(normalizeRepetition({ freq: "" } as RepetitionObject)).toBeNull();
  });

  it("should handle repetition with default interval", () => {
    const repetition: RepetitionObject = {
      freq: "daily",
      occurrences: 5,
    } as RepetitionObject;

    const result = normalizeRepetition(repetition);

    expect(result?.interval).toBe(1);
  });

  it("should normalize empty byday to null", () => {
    const repetition: RepetitionObject = {
      freq: "weekly",
      interval: 1,
      byday: [],
    } as RepetitionObject;

    const result = normalizeRepetition(repetition);

    expect(result?.byday).toBeNull();
  });
});

describe("normalizeTimezone", () => {
  const mockResolveTimezone = (tz: string) => {
    if (tz === "Asia/Saigon") return "Asia/Ho_Chi_Minh";
    return tz;
  };

  it("should resolve timezone aliases", () => {
    const result = normalizeTimezone("Asia/Saigon", mockResolveTimezone);
    expect(result).toBe("Asia/Ho_Chi_Minh");
  });

  it("should return null for empty timezone", () => {
    expect(normalizeTimezone(undefined, mockResolveTimezone)).toBeNull();
    expect(normalizeTimezone(null, mockResolveTimezone)).toBeNull();
    expect(normalizeTimezone("", mockResolveTimezone)).toBeNull();
  });

  it("should return same timezone if no alias", () => {
    const result = normalizeTimezone("UTC", mockResolveTimezone);
    expect(result).toBe("UTC");
  });
});

describe("detectRecurringEventChanges", () => {
  const mockResolveTimezone = (tz: string) => tz;
  const mockFormatDateTime = (iso: string, tz: string) => {
    const date = new Date(iso);
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");
    return `2025-10-14T${hour}:${minute}`;
  };

  it("should detect when only time changes", () => {
    const oldEvent = {
      start: "2025-10-14T07:00:00.000Z",
      end: "2025-10-14T08:00:00.000Z",
      timezone: "UTC",
      allday: false,
      repetition: { freq: "daily", interval: 1 } as RepetitionObject,
    } as CalendarEvent;

    const result = detectRecurringEventChanges(
      oldEvent,
      {
        repetition: { freq: "daily", interval: 1 } as RepetitionObject,
        timezone: "UTC",
        allday: false,
        start: "2025-10-15T09:00",
        end: "2025-10-15T10:00",
      },
      null,
      mockResolveTimezone,
      mockFormatDateTime
    );

    expect(result.timeChanged).toBe(true);
    expect(result.repetitionRulesChanged).toBe(true);
  });

  it("should not detect time change when time is same", () => {
    const oldEvent = {
      start: "2025-10-14T07:00:00.000Z",
      end: "2025-10-14T08:00:00.000Z",
      timezone: "UTC",
      allday: false,
      repetition: { freq: "daily", interval: 1 } as RepetitionObject,
    } as CalendarEvent;

    const result = detectRecurringEventChanges(
      oldEvent,
      {
        repetition: { freq: "daily", interval: 1 } as RepetitionObject,
        timezone: "UTC",
        allday: false,
        start: "2025-10-15T07:00",
        end: "2025-10-15T08:00",
      },
      null,
      mockResolveTimezone,
      mockFormatDateTime
    );

    expect(result.timeChanged).toBe(false);
    expect(result.repetitionRulesChanged).toBe(false);
  });

  it("should detect timezone changes", () => {
    const oldEvent = {
      start: "2025-10-14T07:00:00.000Z",
      timezone: "UTC",
      allday: false,
      repetition: { freq: "daily", interval: 1 } as RepetitionObject,
    } as CalendarEvent;

    const result = detectRecurringEventChanges(
      oldEvent,
      {
        repetition: { freq: "daily", interval: 1 } as RepetitionObject,
        timezone: "Asia/Ho_Chi_Minh",
        allday: false,
        start: "2025-10-15T07:00",
        end: "2025-10-15T08:00",
      },
      null,
      mockResolveTimezone,
      mockFormatDateTime
    );

    expect(result.timezoneChanged).toBe(true);
    expect(result.repetitionRulesChanged).toBe(true);
  });

  it("should resolve timezone aliases before comparison", () => {
    const resolveWithAlias = (tz: string) => {
      if (tz === "Asia/Saigon") return "Asia/Ho_Chi_Minh";
      return tz;
    };

    const oldEvent = {
      start: "2025-10-14T07:00:00.000Z",
      timezone: "Asia/Saigon",
      allday: false,
      repetition: { freq: "daily", interval: 1 } as RepetitionObject,
    } as CalendarEvent;

    const result = detectRecurringEventChanges(
      oldEvent,
      {
        repetition: { freq: "daily", interval: 1 } as RepetitionObject,
        timezone: "Asia/Ho_Chi_Minh",
        allday: false,
        start: "2025-10-15T07:00",
        end: "2025-10-15T08:00",
      },
      null,
      resolveWithAlias,
      mockFormatDateTime
    );

    expect(result.timezoneChanged).toBe(false);
  });

  it("should detect frequency changes", () => {
    const oldEvent = {
      start: "2025-10-14T07:00:00.000Z",
      timezone: "UTC",
      allday: false,
      repetition: { freq: "daily", interval: 1 } as RepetitionObject,
    } as CalendarEvent;

    const result = detectRecurringEventChanges(
      oldEvent,
      {
        repetition: { freq: "weekly", interval: 1 } as RepetitionObject,
        timezone: "UTC",
        allday: false,
        start: "2025-10-15T07:00",
        end: "2025-10-15T08:00",
      },
      null,
      mockResolveTimezone,
      mockFormatDateTime
    );

    expect(result.repetitionRulesChanged).toBe(true);
  });

  it("should detect interval changes", () => {
    const oldEvent = {
      start: "2025-10-14T07:00:00.000Z",
      timezone: "UTC",
      allday: false,
      repetition: { freq: "daily", interval: 1 } as RepetitionObject,
    } as CalendarEvent;

    const result = detectRecurringEventChanges(
      oldEvent,
      {
        repetition: { freq: "daily", interval: 2 } as RepetitionObject,
        timezone: "UTC",
        allday: false,
        start: "2025-10-15T07:00",
        end: "2025-10-15T08:00",
      },
      null,
      mockResolveTimezone,
      mockFormatDateTime
    );

    expect(result.repetitionRulesChanged).toBe(true);
  });

  it("should detect byday changes", () => {
    const oldEvent = {
      start: "2025-10-14T07:00:00.000Z",
      timezone: "UTC",
      allday: false,
      repetition: {
        freq: "weekly",
        interval: 1,
        byday: ["MO", "WE"],
      } as RepetitionObject,
    } as CalendarEvent;

    const result = detectRecurringEventChanges(
      oldEvent,
      {
        repetition: {
          freq: "weekly",
          interval: 1,
          byday: ["MO", "FR"],
        } as RepetitionObject,
        timezone: "UTC",
        allday: false,
        start: "2025-10-15T07:00",
        end: "2025-10-15T08:00",
      },
      null,
      mockResolveTimezone,
      mockFormatDateTime
    );

    expect(result.repetitionRulesChanged).toBe(true);
  });

  it("should detect when multiple properties change", () => {
    const oldEvent = {
      start: "2025-10-14T07:00:00.000Z",
      timezone: "UTC",
      allday: false,
      repetition: { freq: "daily", interval: 1 } as RepetitionObject,
    } as CalendarEvent;

    const result = detectRecurringEventChanges(
      oldEvent,
      {
        repetition: { freq: "weekly", interval: 2 } as RepetitionObject,
        timezone: "Asia/Ho_Chi_Minh",
        allday: true,
        start: "2025-10-15T09:00",
        end: "2025-10-15T10:00",
      },
      null,
      mockResolveTimezone,
      mockFormatDateTime
    );

    expect(result.timeChanged).toBe(true);
    expect(result.timezoneChanged).toBe(true);
    expect(result.repetitionRulesChanged).toBe(true);
  });
});
