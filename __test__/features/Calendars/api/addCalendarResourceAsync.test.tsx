import { addCalendarResourceAsync } from "@/features/Calendars/api/addCalendarResourceAsync";
import { addSharedCalendar } from "@/features/Calendars/CalendarApi";
import { getResourceDetails } from "@/features/User/userAPI";
import { toRejectedError } from "@/utils/errorUtils";
import { configureStore } from "@reduxjs/toolkit";

jest.mock("@/features/Calendars/CalendarApi");
jest.mock("@/features/User/userAPI");
jest.mock("@/utils/errorUtils");

const mockedAddSharedCalendar = addSharedCalendar as jest.Mock;
const mockedGetResourceDetails = getResourceDetails as jest.Mock;
const mockedToRejectedError = toRejectedError as jest.Mock;

describe("addCalendarResourceAsync thunk", () => {
  let store: ReturnType<typeof configureStore>;
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    store = configureStore({
      reducer: () => ({}),
    });
  });

  const mockPayload = {
    userId: "user-123",
    calId: "cal-123",
    cal: {
      color: {
        background: "#000000",
        foreground: "#FFFFFF",
      },
      cal: {
        "dav:name": "Resource Room A",
        "caldav:description": "A meeting room",
        _links: {
          self: {
            href: "/calendars/res-456/cal-123.json",
          },
        },
      },
    },
  };

  const mockResolvedResourceData = {
    _id: "res-456",
    id: "res-456",
    name: "Resource Room A",
    description: "A meeting room",
    creator: "user-789",
    deleted: false,
    _rev: "1",
  };

  it("should add shared calendar, fetch resource details, map userData", async () => {
    mockedGetResourceDetails.mockResolvedValueOnce(mockResolvedResourceData);
    mockedAddSharedCalendar.mockResolvedValueOnce({});

    const result = await addCalendarResourceAsync(mockPayload as unknown as Parameters<typeof addCalendarResourceAsync>[0])(
      dispatch,
      store.getState,
      undefined
    );

    expect(mockedAddSharedCalendar).toHaveBeenCalledWith(
      mockPayload.userId,
      mockPayload.calId,
      mockPayload.cal
    );
    expect(mockedGetResourceDetails).toHaveBeenCalledWith("res-456");

    expect(result.type).toBe("calendars/addCalendarResource/fulfilled");
    expect(result.payload).toEqual({
      calId: "res-456/cal-123",
      color: { background: "#000000", foreground: "#FFFFFF" },
      desc: "A meeting room",
      link: "/calendars/user-123/cal-123.json",
      name: "Resource Room A",
      owner: mockResolvedResourceData,
    });
  });

  it("should fallback to name if resource details fetch fails", async () => {
    mockedAddSharedCalendar.mockResolvedValueOnce({});
    const errorDetails = new Error("Fetch failed");
    mockedGetResourceDetails.mockRejectedValueOnce(errorDetails);
    const mockRejectedErrorResult = { message: "Fetch failed" };
    mockedToRejectedError.mockReturnValueOnce(mockRejectedErrorResult);

    const result = await addCalendarResourceAsync(mockPayload as unknown as Parameters<typeof addCalendarResourceAsync>[0])(
      dispatch,
      store.getState,
      undefined
    );

    expect(mockedAddSharedCalendar).toHaveBeenCalledWith(
      mockPayload.userId,
      mockPayload.calId,
      mockPayload.cal
    );
    expect(mockedGetResourceDetails).toHaveBeenCalledWith("res-456");

    expect(mockedToRejectedError).toHaveBeenCalledWith(errorDetails);

    expect(result.type).toBe("calendars/addCalendarResource/rejected");
    expect(result.payload).toEqual(mockRejectedErrorResult);
  });

  it("should handle error if addSharedCalendar fails", async () => {
    const errorAdd = new Error("Add failed");
    mockedAddSharedCalendar.mockRejectedValueOnce(errorAdd);
    const mockRejectedErrorResult = { message: "Add failed" };
    mockedToRejectedError.mockReturnValueOnce(mockRejectedErrorResult);

    const result = await addCalendarResourceAsync(mockPayload as unknown as Parameters<typeof addCalendarResourceAsync>[0])(
      dispatch,
      store.getState,
      undefined
    );

    expect(mockedAddSharedCalendar).toHaveBeenCalledWith(
      mockPayload.userId,
      mockPayload.calId,
      mockPayload.cal
    );
    expect(mockedGetResourceDetails).not.toHaveBeenCalled();

    expect(mockedToRejectedError).toHaveBeenCalledWith(errorAdd);

    expect(result.type).toBe("calendars/addCalendarResource/rejected");
    expect(result.payload).toEqual(mockRejectedErrorResult);
  });
});
