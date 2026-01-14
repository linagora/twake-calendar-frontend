import { parseMessage } from "../../../../src/websocket/ws/parseMessage";
import { refreshCalendarWithSyncToken } from "../../../../src/features/Calendars/services/refreshCalendar";
import { getDisplayedDate } from "../../../../src/utils/calendarDateManager";
import { store } from "../../../../src/app/store";
import { WS_OUTBOUND_EVENTS } from "../../../../src/websocket/protocols";

jest.mock("../../../../src/features/Calendars/services/refreshCalendar");
jest.mock("../../../../src/utils/calendarDateManager");
jest.mock("../../../../src/app/store", () => ({
  store: {
    getState: jest.fn(),
  },
}));

describe("parseMessage", () => {
  let mockDispatch: jest.Mock;
  const mockDate = new Date("2025-01-15T10:00:00Z");

  const mockState = {
    calendars: {
      list: {
        "cal1/entry1": { id: "cal1/entry1", name: "Calendar 1", syncToken: 1 },
        "cal2/entry2": { id: "cal2/entry2", name: "Calendar 2", syncToken: 1 },
      },
      templist: {},
    },
  };

  beforeEach(() => {
    mockDispatch = jest.fn();
    (getDisplayedDate as jest.Mock).mockReturnValue(mockDate);
    (store.getState as jest.Mock).mockReturnValue(mockState);
    jest.clearAllMocks();
  });

  it("should return empty array for non-object messages", async () => {
    const result1 = await parseMessage(null, mockDispatch);
    const result2 = await parseMessage("string", mockDispatch);
    const result3 = await parseMessage(123, mockDispatch);

    expect(result1).toEqual([]);
    expect(result2).toEqual([]);
    expect(result3).toEqual([]);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("should handle registered event", async () => {
    const message = {
      [WS_OUTBOUND_EVENTS.REGISTER_CLIENT]: [
        "/calendars/cal1/entry1",
        "/calendars/cal2/entry2",
      ],
    };

    const result = await parseMessage(message, mockDispatch);

    expect(result).toContain("/calendars/cal1/entry1");
    expect(result).toContain("/calendars/cal2/entry2");
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(2);
  });

  it("should handle unregistered event", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const message = {
      [WS_OUTBOUND_EVENTS.UNREGISTER_CLIENT]: ["/calendars/cal1/entry1"],
    };

    await parseMessage(message, mockDispatch);

    expect(consoleSpy).toHaveBeenCalledWith("Unregistered Calendar", [
      "/calendars/cal1/entry1",
    ]);

    consoleSpy.mockRestore();
  });

  it("should handle calendar path updates", async () => {
    const message = {
      "/calendars/cal1/entry1": { updated: true },
    };

    const result = await parseMessage(message, mockDispatch);

    expect(result).toContain("/calendars/cal1/entry1");
    expect(refreshCalendarWithSyncToken).toHaveBeenCalled();
  });

  it("should parse valid calendar paths", async () => {
    const message = {
      "/calendars/cal1/entry1": {},
      "/calendars/cal2/entry2": {},
    };

    await parseMessage(message, mockDispatch);

    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(2);
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledWith(
      expect.objectContaining({
        calendar: mockState.calendars.list["cal1/entry1"],
      })
    );
  });

  it("should handle invalid calendar paths gracefully", async () => {
    const message = {
      "/invalid/path": {},
      "not-a-path": {},
    };

    await parseMessage(message, mockDispatch);

    expect(refreshCalendarWithSyncToken).not.toHaveBeenCalled();
  });

  it("should use current displayed date for calendar range", async () => {
    const message = {
      "/calendars/cal1/entry1": {},
    };

    await parseMessage(message, mockDispatch);

    expect(getDisplayedDate).toHaveBeenCalled();
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarRange: expect.any(Object),
      })
    );
  });

  it("should handle multiple event types in single message", async () => {
    const message = {
      [WS_OUTBOUND_EVENTS.REGISTER_CLIENT]: ["/calendars/cal1/entry1"],
      [WS_OUTBOUND_EVENTS.UNREGISTER_CLIENT]: ["/calendars/cal2/entry2"],
      "/calendars/cal1/entry1": {},
    };

    const result = await parseMessage(message, mockDispatch);

    expect(result.length).toBe(2);
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(2);
  });

  it("should dispatch refreshCalendarWithSyncToken with correct parameters", async () => {
    const message = {
      "/calendars/cal1/entry1": {},
    };

    await parseMessage(message, mockDispatch);

    expect(refreshCalendarWithSyncToken).toHaveBeenCalledWith({
      calendar: mockState.calendars.list["cal1/entry1"],
      calType: undefined,
      calendarRange: expect.any(Object),
    });
  });

  it("should handle temp calendars", async () => {
    const stateWithTemp = {
      calendars: {
        list: {},
        templist: {
          "temp1/entry1": {
            id: "temp1/entry1",
            name: "Temp Calendar",
            syncToken: 1,
          },
        },
      },
    };

    (store.getState as jest.Mock).mockReturnValue(stateWithTemp);

    const message = {
      "/calendars/temp1/entry1": {},
    };

    await parseMessage(message, mockDispatch);

    expect(refreshCalendarWithSyncToken).toHaveBeenCalledWith({
      calendar: stateWithTemp.calendars.templist["temp1/entry1"],
      calType: "temp",
      calendarRange: expect.any(Object),
    });
  });
});
