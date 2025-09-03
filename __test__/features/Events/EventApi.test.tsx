import {
  putEvent,
  moveEvent,
  deleteEvent,
} from "../../../src/features/Events/EventApi";
import { calendarEventToJCal } from "../../../src/features/Events/eventUtils";
import { clientConfig } from "../../../src/features/User/oidcAuth";
import { api } from "../../../src/utils/apiUtils";
clientConfig.url = "https://example.com";

jest.mock("../../../src/utils/apiUtils");

const day = new Date();

const mockEvent = {
  uid: "event1",
  title: "Test Event",
  timezone: "UTC",
  calId: "667037022b752d0026472254/cal1",
  URL: "/calendars/667037022b752d0026472254/667037022b752d0026472254/cal1.ics",
  start: day,
  end: day,
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
};

describe("eventApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("putEvent sends PUT request with JCal body", async () => {
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

  test("putEvent logs when status is 201", async () => {
    const mockResponse = { status: 201, url: "/dav/cals/test.ics" };
    (api as unknown as jest.Mock).mockReturnValue(mockResponse);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await putEvent(mockEvent);
    expect(logSpy).toHaveBeenCalledWith("PUT (201) :", "/dav/cals/test.ics");

    logSpy.mockRestore();
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

  test("deleteEvent sends DELETE request and returns json response", async () => {
    const mockResponse = { ok: true };
    (api as unknown as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await deleteEvent("/calendars/test.ics");

    expect(api).toHaveBeenCalledWith("dav/calendars/test.ics", {
      method: "DELETE",
    });
  });
});
