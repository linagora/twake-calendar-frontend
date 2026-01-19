import {
  putEvent,
  moveEvent,
  deleteEvent,
  importEventFromFile,
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
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    const mockResponse = { status: 201, url: "/dav/cals/test.ics" };
    (api as unknown as jest.Mock).mockReturnValue(mockResponse);

    await putEvent(mockEvent);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Event created successfully:",
      "/dav/cals/test.ics"
    );

    consoleLogSpy.mockRestore();
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
});
