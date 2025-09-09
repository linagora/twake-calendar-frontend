import { CalendarEvent } from "../../../src/features/Events/EventsTypes";
import {
  calendarEventToJCal,
  parseCalendarEvent,
} from "../../../src/features/Events/eventUtils";
import { TIMEZONES } from "../../../src/utils/timezone-data";

describe("parseCalendarEvent", () => {
  const baseColor = "#00FF00";
  const calendarId = "calendar-123";

  it("parses a full event correctly", () => {
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

    const result = calendarEventToJCal(mockEvent as CalendarEvent);

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

    const result = calendarEventToJCal(mockEvent as CalendarEvent);

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
});
