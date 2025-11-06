// __test__/features/calendars/calendarApi.test.ts

import {
  addSharedCalendar,
  getCalendar,
  getCalendars,
  getSecretLink,
  postCalendar,
  proppatchCalendar,
  removeCalendar,
} from "../../../src/features/Calendars/CalendarApi";
import { clientConfig } from "../../../src/features/User/oidcAuth";
import { api } from "../../../src/utils/apiUtils";
clientConfig.url = "https://example.com";

jest.mock("../../../src/utils/apiUtils");

describe("Calendar API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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
  it("postCalendar", async () => {
    const calId = "calId";
    const userId = "userId";
    const color = { light: "calId" };
    const name = "new cal";
    const desc = "desc";

    const result = await postCalendar(userId, calId, color, name, desc);

    expect(api.post).toHaveBeenCalledWith(`dav/calendars/${userId}.json`, {
      headers: {
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify({
        id: "calId",
        "dav:name": "new cal",
        "apple:color": "calId",
        "caldav:description": "desc",
      }),
    });
  });
  it("patch Calendar", async () => {
    const calId = "calId";
    const calLink = "/calendars/calId.json";
    const color = { light: "calIdLight", dark: "calIdDark" };
    const name = "new cal";
    const desc = "desc";

    const result = await proppatchCalendar(calLink, { color, name, desc });

    expect(api).toHaveBeenCalledWith(`dav${calLink}`, {
      method: "PROPPATCH",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify({
        "dav:name": "new cal",
        "caldav:description": "desc",
        "apple:color": "calIdLight",
      }),
    });
  });

  it("remove Calendar", async () => {
    const calLink = "/calendars/calId.json";
    const result = await removeCalendar(calLink);

    expect(api).toHaveBeenCalledWith(`dav${calLink}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });
  });

  it("get secret link ", async () => {
    const calLink = "/calendars/calId.json";
    (api.get as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue("link"),
    });

    const noreset = await getSecretLink(calLink, false);

    expect(api.get).toHaveBeenCalledWith(
      `calendar/api${calLink}/secret-link?shouldResetLink=false`,
      {
        headers: {
          Accept: "application/json, text/plain, */*",
        },
      }
    );
  });
  it("get secret link ", async () => {
    const calLink = "/calendars/calId.json";
    (api.get as jest.Mock).mockReturnValue({
      json: jest.fn().mockResolvedValue("link"),
    });
    const reset = await getSecretLink(calLink, true);

    expect(api.get).toHaveBeenCalledWith(
      `calendar/api${calLink}/secret-link?shouldResetLink=true`,
      {
        headers: {
          Accept: "application/json, text/plain, */*",
        },
      }
    );
  });

  it("When adding a sharedCal with #default as a name a new name is sent to the back", async () => {
    const mockApiPost = jest.spyOn(api, "post");

    const calData = {
      cal: {
        id: "cal123",
        "dav:name": "#default",
        "apple:color": "#FF5733",
        "caldav:description": "Default calendar",
        acl: [],
        invite: [],
        _links: {
          self: {
            href: "/calendars/owner123/cal123.json",
          },
        },
      },
      owner: {
        displayName: "John Doe",
        email: "john.doe@example.com",
        openpaasId: "owner123",
      },
      color: "#FF5733",
    };

    await addSharedCalendar("currentUserId", "newCalId123", calData);

    expect(mockApiPost).toHaveBeenCalledWith(
      "dav/calendars/currentUserId.json",
      expect.objectContaining({
        body: expect.stringContaining('"dav:name":"John Doe\'s calendar"'),
      })
    );

    const callBody = JSON.parse(String(mockApiPost.mock.calls[0][1]?.body));
    expect(callBody["dav:name"]).toBe("John Doe's calendar");
    expect(callBody["dav:name"]).not.toBe("#default");
  });
});
