import { updateSeries } from "@/features/Events/api/updateSeries";
import {
  deleteEvent,
  importEventFromFile,
  moveEvent,
  putEvent,
  searchEvent,
} from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { calendarEventToJCal } from "@/features/Events/eventUtils";
import { clientConfig } from "@/features/User/oidcAuth";
import { api } from "@/utils/apiUtils";

clientConfig.url = "https://example.com";

jest.mock("@/utils/apiUtils");

const day = new Date();

const mockEvent = {
  uid: "event1",
  title: "Test Event",
  timezone: "UTC",
  calId: "667037022b752d0026472254/cal1",
  URL: "/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics",
  start: day.toISOString(),
  end: day.toISOString(),
  status: "PUBLIC",
  organizer: { cn: "test", cal_address: "test@test.com" },
  attendee: [
    {
      cn: "test",
      cal_address: "test@test.com",
      partstat: "NEEDS-ACTION",
      rsvp: "TRUE",
      role: "REQ-PARTICIPANT",
      cutype: "INDIVIDUAL",
    },
    {
      cn: "John",
      cal_address: "john@test.com",
      partstat: "NEEDS-ACTION",
      rsvp: "TRUE",
      role: "REQ-PARTICIPANT",
      cutype: "INDIVIDUAL",
    },
  ],
} as CalendarEvent;

describe("eventApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("putEvent sends PUT request with JCal body", async () => {
    const mockResponse = { status: 201, url: "/dav/cals/test.ics" };
    (api as unknown as jest.Mock).mockReturnValue(mockResponse);
    const result = await putEvent(mockEvent);
    const expectedResult = calendarEventToJCal(mockEvent);
    expect(api).toHaveBeenCalledWith(
      "dav/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics",
      expect.objectContaining({
        method: "PUT",
        headers: { "content-type": "text/calendar; charset=utf-8" },
        body: JSON.stringify(expectedResult),
      })
    );
    expect(result).toBe(mockResponse);
  });

  it("putEvent logs when status is 201", async () => {
    const consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
    const mockResponse = { status: 201, url: "/dav/cals/test.ics" };
    (api as unknown as jest.Mock).mockReturnValue(mockResponse);

    await putEvent(mockEvent);

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "Event created successfully:",
      "/dav/cals/test.ics"
    );

    consoleInfoSpy.mockRestore();
  });

  test("moveEvent sends MOVE request with destination header", async () => {
    const mockResponse = { status: 204 };
    (api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    const result = await moveEvent(mockEvent, "newurl.ics");

    expect(api).toHaveBeenCalledWith(
      "dav/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics",
      expect.objectContaining({
        method: "MOVE",
        headers: {
          destination: "newurl.ics",
        },
      })
    );
  });

  it("deleteEvent sends DELETE request and returns json response", async () => {
    const mockResponse = { ok: true };
    (api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await deleteEvent("/calendars/test.ics");

    expect(api).toHaveBeenCalledWith("dav/calendars/test.ics", {
      method: "DELETE",
    });
  });

  it("import event file", async () => {
    const mockResponse = { status: 202 };
    (api.post as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    await importEventFromFile("123456789", "/calendar/calLink.json");

    expect(api.post).toHaveBeenCalledWith("api/import", {
      body: JSON.stringify({
        fileId: "123456789",
        target: "/calendar/calLink.json",
      }),
    });
  });

  test("putEvent handles byday field correctly", async () => {
    const mockResponse = { status: 201, url: "/dav/cals/test.ics" };
    (api as unknown as jest.Mock).mockReturnValue(mockResponse);

    const eventWithByday = {
      ...mockEvent,
      repetition: {
        freq: "weekly",
        interval: 1,
        byday: ["MO", "WE", "FR"],
      },
    };

    await putEvent(eventWithByday);
    const expectedResult = calendarEventToJCal(eventWithByday);

    expect(api).toHaveBeenCalledWith(
      "dav/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics",
      expect.objectContaining({
        method: "PUT",
        headers: { "content-type": "text/calendar; charset=utf-8" },
        body: JSON.stringify(expectedResult),
      })
    );
  });

  test("putEvent handles null byday field correctly", async () => {
    const mockResponse = { status: 201, url: "/dav/cals/test.ics" };
    (api as unknown as jest.Mock).mockReturnValue(mockResponse);

    const eventWithNullByday = {
      ...mockEvent,
      repetition: {
        freq: "daily",
        interval: 1,
        byday: null,
      },
    };

    await putEvent(eventWithNullByday);
    const expectedResult = calendarEventToJCal(eventWithNullByday);

    expect(api).toHaveBeenCalledWith(
      "dav/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics",
      expect.objectContaining({
        method: "PUT",
        headers: { "content-type": "text/calendar; charset=utf-8" },
        body: JSON.stringify(expectedResult),
      })
    );
  });

  describe("searchEvent", () => {
    const mockFilters = {
      searchIn: ["user1/calendar1", "user2/calendar2"],
      keywords: "meeting",
      organizers: ["org@example.com"],
      attendees: ["part@example.com"],
    };

    it("should call API with correct parameters", async () => {
      const mockResponse = {
        _total_hits: 5,
        _embedded: { events: [] },
      };

      (api.post as jest.Mock).mockReturnValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await searchEvent("test", mockFilters);

      expect(api.post).toHaveBeenCalledWith(
        "calendar/api/events/search?limit=30&offset=0",
        {
          body: JSON.stringify({
            query: "meeting",
            calendars: [
              { calendarId: "calendar1", userId: "user1" },
              { calendarId: "calendar2", userId: "user2" },
            ],
            organizers: ["org@example.com"],
            attendees: ["part@example.com"],
          }),
        }
      );
    });

    it("should use query param when keywords is empty", async () => {
      const mockResponse = { _total_hits: 0, _embedded: { events: [] } };

      (api.post as jest.Mock).mockReturnValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await searchEvent("fallback query", {
        ...mockFilters,
        keywords: "",
      });

      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"query":"fallback query"'),
        })
      );
    });

    it("should omit organizers when empty", async () => {
      const mockResponse = { _total_hits: 0, _embedded: { events: [] } };

      (api.post as jest.Mock).mockReturnValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await searchEvent("test", {
        ...mockFilters,
        organizers: [],
      });

      const callArgs = (api.post as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.organizers).toBeUndefined();
    });

    it("should omit participants when empty", async () => {
      const mockResponse = { _total_hits: 0, _embedded: { events: [] } };

      (api.post as jest.Mock).mockReturnValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await searchEvent("test", {
        ...mockFilters,
        attendees: [],
      });

      const callArgs = (api.post as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.participants).toBeUndefined();
    });
  });

  describe("updateSeries", () => {
    const recurringEventICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
DTEND:20240201T110000Z
RRULE:FREQ=DAILY
SUMMARY:Old title
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
DTEND:20240202T110000Z
SUMMARY:Old title
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

    beforeEach(() => {
      jest.clearAllMocks();

      (api.get as jest.Mock).mockResolvedValue({
        text: jest.fn().mockResolvedValue(recurringEventICS),
      });

      (api as jest.Mock).mockResolvedValue({ ok: true });
    });

    it("propagates summary changes to overrides", async () => {
      await updateSeries(
        { ...mockEvent, title: "New title" } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");

      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      const summary = override[1].find(([k]: any) => k === "summary");
      expect(summary[3]).toBe("New title");
    });

    it("does not remove recurrence-id from overrides", async () => {
      await updateSeries(mockEvent as any, undefined, false);

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");

      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      expect(override).toBeDefined();
    });

    it("increments SEQUENCE on overrides when metadata changes", async () => {
      await updateSeries(
        { ...mockEvent, title: "Changed title" } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");

      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      const sequence = override[1].find(([k]: any) => k === "sequence");
      expect(sequence[3]).toBe(2);
    });

    it("propagates description, location, class, and transp changes", async () => {
      const icsWithMultipleFields = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
DTEND:20240201T110000Z
RRULE:FREQ=DAILY
SUMMARY:Title
DESCRIPTION:Old description
LOCATION:Old location
CLASS:PUBLIC
TRANSP:OPAQUE
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
DTEND:20240202T110000Z
SUMMARY:Title
DESCRIPTION:Old description
LOCATION:Old location
CLASS:PUBLIC
TRANSP:OPAQUE
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

      (api.get as jest.Mock).mockResolvedValueOnce({
        text: jest.fn().mockResolvedValue(icsWithMultipleFields),
      });

      await updateSeries(
        {
          ...mockEvent,
          description: "New description",
          location: "New location",
          class: "PRIVATE",
          transp: "TRANSPARENT",
        } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");
      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      const description = override[1].find(([k]: any) => k === "description");
      const location = override[1].find(([k]: any) => k === "location");
      const classField = override[1].find(([k]: any) => k === "class");
      const transp = override[1].find(([k]: any) => k === "transp");

      expect(description[3]).toBe("New description");
      expect(location[3]).toBe("New location");
      expect(classField[3]).toBe("PRIVATE");
      expect(transp[3]).toBe("TRANSPARENT");
    });

    it("propagates organizer changes", async () => {
      const icsWithOrganizer = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
RRULE:FREQ=DAILY
SUMMARY:Title
ORGANIZER;CN=Alice:mailto:alice@example.com
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
SUMMARY:Title
ORGANIZER;CN=Alice:mailto:alice@example.com
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

      (api.get as jest.Mock).mockResolvedValueOnce({
        text: jest.fn().mockResolvedValue(icsWithOrganizer),
      });

      await updateSeries(
        {
          ...mockEvent,
          organizer: { cn: "Bob", cal_address: "bob@example.com" },
        } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");
      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      const organizer = override[1].find(([k]: any) => k === "organizer");
      expect(organizer[3]).toBe("mailto:bob@example.com");
      expect(organizer[1].cn).toBe("Bob");
    });

    it("propagates attendee changes", async () => {
      const icsWithAttendees = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
RRULE:FREQ=DAILY
SUMMARY:Title
ATTENDEE;CN=Alice:mailto:alice@example.com
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
SUMMARY:Title
ATTENDEE;CN=Alice:mailto:alice@example.com
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

      (api.get as jest.Mock).mockResolvedValueOnce({
        text: jest.fn().mockResolvedValue(icsWithAttendees),
      });

      await updateSeries(
        {
          ...mockEvent,
          attendee: [
            {
              cn: "Bob",
              cal_address: "bob@example.com",
              partstat: "NEEDS-ACTION",
              cutype: "INDIVIDUAL",
              role: "REQ-PARTICIPANT",
              rsvp: "TRUE",
            },
            {
              cn: "Charlie",
              cal_address: "charlie@example.com",
              partstat: "NEEDS-ACTION",
              cutype: "INDIVIDUAL",
              role: "REQ-PARTICIPANT",
              rsvp: "TRUE",
            },
          ],
        } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");
      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      const attendees = override[1].filter(([k]: any) => k === "attendee");
      expect(attendees).toHaveLength(2);
      expect(attendees[0][3]).toBe("mailto:bob@example.com");
      expect(attendees[1][3]).toBe("mailto:charlie@example.com");
    });

    it("propagates x-openpaas-videoconference changes", async () => {
      const icsWithVideo = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
RRULE:FREQ=DAILY
SUMMARY:Title
X-OPENPAAS-VIDEOCONFERENCE:https://meet.old.com
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
SUMMARY:Title
X-OPENPAAS-VIDEOCONFERENCE:https://meet.old.com
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

      (api.get as jest.Mock).mockResolvedValueOnce({
        text: jest.fn().mockResolvedValue(icsWithVideo),
      });

      await updateSeries(
        {
          ...mockEvent,
          x_openpass_videoconference: "https://meet.new.com",
        } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");
      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      const videoconf = override[1].find(
        ([k]: any) => k === "x-openpaas-videoconference"
      );
      expect(videoconf[3]).toBe("https://meet.new.com");
    });

    it("works with multiple override instances", async () => {
      const icsMultipleOverrides = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
DTEND:20240201T110000Z
RRULE:FREQ=DAILY
SUMMARY:Old
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
DTEND:20240202T110000Z
SUMMARY:Old
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240203T100000Z
DTSTART:20240203T100000Z
DTEND:20240203T110000Z
SUMMARY:Old
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

      (api.get as jest.Mock).mockResolvedValueOnce({
        text: jest.fn().mockResolvedValue(icsMultipleOverrides),
      });

      await updateSeries(
        { ...mockEvent, title: "New title" } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");
      const overrides = vevents.filter(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      expect(overrides).toHaveLength(2);
      overrides.forEach((override) => {
        const summary = override[1].find(([k]: any) => k === "summary");
        const sequence = override[1].find(([k]: any) => k === "sequence");
        expect(summary[3]).toBe("New title");
        expect(sequence[3]).toBe(2);
      });
    });

    it("adds sequence field when missing and metadata changes", async () => {
      const icsNoSequence = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
DTEND:20240201T110000Z
RRULE:FREQ=DAILY
SUMMARY:Old
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
DTEND:20240202T110000Z
SUMMARY:Old
END:VEVENT
END:VCALENDAR
`;

      (api.get as jest.Mock).mockResolvedValueOnce({
        text: jest.fn().mockResolvedValue(icsNoSequence),
      });

      await updateSeries(
        { ...mockEvent, title: "New title" } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");
      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      const sequence = override[1].find(([k]: any) => k === "sequence");
      expect(sequence[3]).toBe(1);
    });

    it("preserves override-specific fields when propagating metadata", async () => {
      const icsCustomFields = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
DTEND:20240201T110000Z
RRULE:FREQ=DAILY
SUMMARY:Old
SEQUENCE:1
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T140000Z
DTEND:20240202T150000Z
SUMMARY:Old
DESCRIPTION:custom-value
SEQUENCE:1
END:VEVENT
END:VCALENDAR
`;

      (api.get as jest.Mock).mockResolvedValueOnce({
        text: jest.fn().mockResolvedValue(icsCustomFields),
      });

      await updateSeries(
        { ...mockEvent, title: "New title" } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");
      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      const summary = override[1].find(([k]: any) => k === "summary");
      const dtstart = override[1].find(([k]: any) => k === "dtstart");
      const dtend = override[1].find(([k]: any) => k === "dtend");
      const description = override[1].find(([k]: any) => k === "description");
      const recurrenceId = override[1].find(
        ([k]: any) => k === "recurrence-id"
      );
      // Summary should be updated
      expect(summary[3]).toBe("New title");
      // Override-specific time should be preserved
      expect(dtstart[3]).toBe("2024-02-02T14:00:00Z");
      expect(dtend[3]).toBe("2024-02-02T15:00:00Z");
      // Custom field should be preserved
      expect(description[3]).toBe("custom-value");
      // Recurrence-id should be preserved
      expect(recurrenceId[3]).toBe("2024-02-02T10:00:00Z");
    });

    const recurringWithAlarmICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1
DTSTART:20240201T100000Z
RRULE:FREQ=DAILY
SUMMARY:Old
BEGIN:VALARM
ACTION:DISPLAY
TRIGGER:-PT15M
END:VALARM
END:VEVENT
BEGIN:VEVENT
UID:event1
RECURRENCE-ID:20240202T100000Z
DTSTART:20240202T100000Z
SUMMARY:Old
BEGIN:VALARM
ACTION:DISPLAY
TRIGGER:-PT15M
END:VALARM
END:VEVENT
END:VCALENDAR
`;

    it("replaces VALARM on overrides when alarm changes", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({
        text: jest.fn().mockResolvedValue(recurringWithAlarmICS),
      });

      await updateSeries(
        { ...mockEvent, alarm: { action: "EMAIL", trigger: "-PT30M" } } as any,
        undefined,
        false
      );

      const body = JSON.parse((api as jest.Mock).mock.calls[0][1].body);
      const vevents = body[2].filter(([n]: any) => n === "vevent");

      const override = vevents.find(([, props]: any) =>
        props.some(([k]: any) => k === "recurrence-id")
      );

      const alarms = override[2].filter(([n]: any) => n === "valarm");

      expect(alarms).toHaveLength(1);
      const action = alarms[0][1].find(([k]: any) => k === "action");
      const trigger = alarms[0][1].find(([k]: any) => k === "trigger");
      expect(action[3]).toBe("EMAIL");
      expect(trigger[3]).toBe("-PT30M");
    });
  });
});
