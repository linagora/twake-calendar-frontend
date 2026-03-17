import { getCalendarsListAsync } from "@/features/Calendars/services/getCalendarsListAsync";
import { getOpenPaasUser } from "@/features/User/userAPI";
import { fetchOwnerData } from "@/features/Calendars/services/helpers";
import { getCalendars } from "@/features/Calendars/CalendarApi";
import { formatReduxError } from "@/utils/errorUtils";
import { normalizeCalendar } from "@/features/Calendars/utils/normalizeCalendar";

jest.mock("@/features/User/userAPI");
jest.mock("@/features/Calendars/services/helpers");
jest.mock("@/features/Calendars/CalendarApi");
jest.mock("@/utils/errorUtils");
jest.mock("@/features/Calendars/utils/normalizeCalendar");
jest.mock("@/utils/getAccessiblePair", () => ({
  getAccessiblePair: jest.fn().mockReturnValue("#FFF"),
}));

jest.mock("@mui/material/styles", () => ({
  createTheme: jest.fn().mockReturnValue({}),
}));

const mockedGetOpenPaasUser = getOpenPaasUser as jest.Mock;
const mockedFetchOwnerData = fetchOwnerData as jest.Mock;
const mockedGetCalendars = getCalendars as jest.Mock;
const mockedFormatReduxError = formatReduxError as jest.Mock;
const mockedNormalizeCalendar = normalizeCalendar as jest.Mock;

describe("getCalendarsListAsync", () => {
  let dispatch: jest.Mock;
  let getState: jest.Mock;

  beforeEach(() => {
    dispatch = jest.fn();
    getState = jest.fn();
    jest.clearAllMocks();

    mockedFormatReduxError.mockImplementation((err) => {
      if (err?.message) return err.message;
      if (typeof err === "string") return err;
      return JSON.stringify(err);
    });
  });

  it("should handle successful execution and merge with existing calendars", async () => {
    getState.mockReturnValue({
      calendars: {
        list: {
          "cal-existing": {
            id: "cal-existing",
            color: { light: "red", dark: "#FFF" },
            events: { "event-1": {} },
          },
        },
      },
      user: {
        userData: { openpaasId: "user-123" },
      },
    });

    const mockCalendarsResponse = {
      _embedded: {
        "dav:calendar": [{ id: "cal-existing" }, { id: "cal-new" }],
      },
    };
    mockedGetCalendars.mockResolvedValue(mockCalendarsResponse);

    mockedNormalizeCalendar
      .mockReturnValueOnce({
        cal: { "dav:name": "Existing Cal", "apple:color": "blue" },
        id: "cal-existing",
        ownerId: "user-123",
        description: "old cal",
        delegated: false,
        link: "/link/1",
        visibility: 1,
        access: 3,
      })
      .mockReturnValueOnce({
        cal: { "dav:name": "New Cal" },
        id: "cal-new",
        ownerId: "user-456",
        description: "new cal",
        delegated: true,
        link: "/link/2",
        visibility: 2,
        access: 2,
        invite: [{ href: "", principal: "", access: 3, inviteStatus: 1 }],
      });

    mockedFetchOwnerData
      .mockResolvedValueOnce({
        firstname: "John",
        lastname: "Doe",
        emails: ["john@example.com"],
      })
      .mockResolvedValueOnce({
        firstname: "Jane",
        lastname: "Smith",
        emails: ["jane@example.com"],
      });

    const thunk = getCalendarsListAsync();
    const result = await thunk(dispatch, getState, undefined);

    expect(result.type).toBe("calendars/getCalendars/fulfilled");
    const payload = result.payload as {
      importedCalendars: any;
      errors: string;
    };

    expect(payload.errors).toBe("");
    expect(Object.keys(payload.importedCalendars)).toHaveLength(2);

    expect(payload.importedCalendars["cal-existing"]).toMatchObject({
      id: "cal-existing",
      color: { light: "blue", dark: "#FFF" },
      events: { "event-1": {} },
    });

    expect(payload.importedCalendars["cal-new"]).toMatchObject({
      id: "cal-new",
      name: "New Cal",
      owner: { firstname: "Jane", lastname: "Smith" },
    });

    expect(mockedGetOpenPaasUser).not.toHaveBeenCalled(); // User ID existed in state
    expect(mockedGetCalendars).toHaveBeenCalledWith("user-123");
  });

  it("should fetch user using getOpenPaasUser if openpaasId is not in state", async () => {
    getState.mockReturnValue({ calendars: {}, user: {} });
    mockedGetOpenPaasUser.mockResolvedValue({ id: "fetched-user-123" });
    mockedGetCalendars.mockResolvedValue({ _embedded: { "dav:calendar": [] } });

    const thunk = getCalendarsListAsync();
    await thunk(dispatch, getState, undefined);

    expect(mockedGetOpenPaasUser).toHaveBeenCalled();
    expect(mockedGetCalendars).toHaveBeenCalledWith("fetched-user-123");
  });

  it("should handle error when API call fails", async () => {
    getState.mockReturnValue({ calendars: {}, user: {} });
    mockedGetOpenPaasUser.mockResolvedValue({ id: "fetched-user-123" });

    mockedGetCalendars.mockRejectedValue({
      response: { status: 500 },
      message: "Server Error",
    });

    // toRejectedError is imported from a mocked module; provide the expected return
    const { toRejectedError } = jest.requireMock("@/utils/errorUtils") as {
      toRejectedError: jest.Mock;
    };
    toRejectedError.mockReturnValueOnce({
      status: 500,
      message: "Server Error",
    });

    const thunk = getCalendarsListAsync();
    const result = await thunk(dispatch, getState, undefined);

    expect(result.type).toBe("calendars/getCalendars/rejected");
    expect(result.payload).toEqual({
      status: 500,
      message: "Server Error",
    });
  });

  it("should handle error when fetching owner data fails", async () => {
    getState.mockReturnValue({
      calendars: {},
      user: { userData: { openpaasId: "user-123" } },
    });
    mockedGetCalendars.mockResolvedValue({
      _embedded: { "dav:calendar": [{ id: "cal-1" }] },
    });
    mockedNormalizeCalendar.mockReturnValue({
      cal: { "dav:name": "Error Cal" },
      id: "cal-1",
      ownerId: "error-123",
    });

    // fetchOwnerData fails
    mockedFetchOwnerData.mockRejectedValueOnce(new Error("Network Error"));

    const thunk = getCalendarsListAsync();
    const result = await thunk(dispatch, getState, undefined);

    const payload = result.payload as any;
    expect(mockedFetchOwnerData).toHaveBeenCalledWith("error-123");
    expect(payload.importedCalendars["cal-1"].owner).toEqual({
      firstname: "",
      lastname: "Unknown User",
      emails: [],
    });
    // Errors array should contain the error
    expect(payload.errors).toContain("Network Error");
  });

  it("should return owner data mapping properly (including resource: true)", async () => {
    getState.mockReturnValue({
      calendars: {},
      user: { userData: { openpaasId: "user-123" } },
    });
    mockedGetCalendars.mockResolvedValue({
      _embedded: { "dav:calendar": [{ id: "cal-1" }] },
    });
    mockedNormalizeCalendar.mockReturnValue({
      cal: { "dav:name": "Resource Cal" },
      id: "cal-1",
      ownerId: "resource-123",
    });

    // fetchOwnerData succeeds and returns a resource config structure
    mockedFetchOwnerData.mockResolvedValueOnce({
      firstname: "Creator",
      lastname: "User",
      emails: [],
      resource: true,
    });

    const thunk = getCalendarsListAsync();
    const result = await thunk(dispatch, getState, undefined);

    const payload = result.payload as any;
    expect(mockedFetchOwnerData).toHaveBeenCalledWith("resource-123");
    expect(payload.importedCalendars["cal-1"].owner).toEqual({
      firstname: "Creator",
      lastname: "User",
      emails: [],
      resource: true,
    });
  });
});
