import { parseCalendarEvent } from "../../../src/features/Events/eventUtils";

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
      ["ORGANIZER", { cn: "Alice" }, "cal-address", "mailto:alice@example.com"],
      [
        "ATTENDEE",
        { cn: "Bob", partstat: "ACCEPTED" },
        "cal-address",
        "mailto:bob@example.com",
      ],
      ["X-OPENPAAS-VIDEOCONFERENCE", {}, "text", "https://meet.link"],
      ["STATUS", {}, "text", "CONFIRMED"],
      ["SEQUENCE", {}, "integer", "2"],
      ["DTSTAMP", {}, "date-time", "2025-07-18T08:00:00Z"],
    ] as unknown as [string, Record<string, string>, string, any];

    const result = parseCalendarEvent(rawData, baseColor, calendarId);

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

  it("appends recurrence-id to UID if present", () => {
    const rawData: any = [
      ["UID", {}, "text", "event-2"],
      ["RECURRENCE-ID", {}, "date-time", "2025-07-18T09:00:00Z"],
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
    ];

    const result = parseCalendarEvent(rawData, baseColor, calendarId);

    expect(result.uid).toBe("event-2/2025-07-18T09:00:00Z");
  });

  it("returns error if UID or start is missing", () => {
    const rawDataMissingUid: any = [
      ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
    ];

    const result = parseCalendarEvent(rawDataMissingUid, baseColor, calendarId);
    expect(result.error).toMatch(/missing crucial event param/);

    const rawDataMissingStart: any = [["UID", {}, "text", "event-3"]];

    const result2 = parseCalendarEvent(
      rawDataMissingStart,
      baseColor,
      calendarId
    );
    expect(result2.error).toMatch(/missing crucial event param/);
  });

  it("handles optional organizer and attendee fields gracefully", () => {
    const rawData = [
        ["UID", {}, "text", "event-4"],
        ["DTSTART", {}, "date-time", "2025-07-18T09:00:00Z"],
        ["ATTENDEE", {}, "cal-address", "mailto:john@example.com"],
        ["ORGANIZER", {}, "cal-address", "mailto:jane@example.com"],
    ] as unknown as [string, Record<string, string>, string, any];

    const result = parseCalendarEvent(rawData, baseColor, calendarId);

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
