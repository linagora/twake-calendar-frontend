// __test__/features/calendars/calendarApi.test.ts

import {
  getCalendar,
  getCalendars,
} from "../../../src/features/Calendars/CalendarApi";
import { clientConfig } from "../../../src/features/User/oidcAuth";
import { api } from "../../../src/utils/apiUtils";
clientConfig.url = "https://example.com";

jest.mock("../../../src/utils/apiUtils");

describe("Calendar API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCalendars", () => {
    it("fetches calendar list for a user", async () => {
      const mockUserId = "user123";
      const mockResponse = [{ id: "calendar1" }, { id: "calendar2" }];

      (api.get as jest.Mock).mockReturnValue({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const calendars = await getCalendars(mockUserId);

      expect(api.get).toHaveBeenCalledWith(
        `dav/calendars/${mockUserId}.json?personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&withRights=true`,
        {
          headers: { Accept: "application/calendar+json" },
        }
      );
      expect(calendars).toEqual(mockResponse);
    });
  });

  describe("getCalendar", () => {
    it("fetches calendar events for a given ID and match window", async () => {
      const calendarId = "calendar1";
      const match = { start: "2025-07-01", end: "2025-07-31" };
      const mockCalendarData = { events: ["event1", "event2"] };

      (api as unknown as jest.Mock).mockReturnValue({
        json: jest.fn().mockResolvedValue(mockCalendarData),
      });

      const result = await getCalendar(calendarId, match);

      expect(api).toHaveBeenCalledWith(`dav/calendars/${calendarId}.json`, {
        method: "REPORT",
        headers: {
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify({ match }),
      });

      expect(result).toEqual(mockCalendarData);
    });
  });
});
