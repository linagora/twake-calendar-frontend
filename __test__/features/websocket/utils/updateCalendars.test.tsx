import { AppDispatch, RootState, store } from "@/app/store";
import { refreshCalendarWithSyncToken } from "@/features/Calendars/services/refreshCalendar";
import { getDisplayedCalendarRange } from "@/utils/CalendarRangeManager";
import { updateCalendars } from "@/websocket/messaging/updateCalendars";
import { WS_INBOUND_EVENTS } from "@/websocket/protocols";
import { waitFor } from "@testing-library/dom";

jest.mock("@/features/Calendars/services/refreshCalendar");
jest.mock("@/utils/CalendarRangeManager");
jest.mock("@/app/store", () => ({
  store: {
    getState: jest.fn(),
  },
}));

describe("updateCalendars", () => {
  let mockDispatch: jest.Mock;
  const mockRange = {
    start: new Date("2025-01-15T10:00:00Z"),
    end: new Date("2025-01-16T10:00:00Z"),
  };

  const mockState = {
    calendars: {
      list: {
        "cal1/entry1": { id: "cal1/entry1", name: "Calendar 1", syncToken: 1 },
        "cal2/entry2": { id: "cal2/entry2", name: "Calendar 2", syncToken: 1 },
      },
      templist: {},
    },
  } as unknown as RootState;
  const mockAccumulators: {
    calendarsToRefresh: Map<string, any>;
    calendarsToHide: Set<string>;
    debouncedUpdateFn?: (dispatch: AppDispatch) => void;
    currentDebouncePeriod?: number;
  } = {
    calendarsToRefresh: new Map<string, any>(),
    calendarsToHide: new Set(),
    currentDebouncePeriod: 0,
    debouncedUpdateFn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch = jest.fn();
    (getDisplayedCalendarRange as jest.Mock).mockReturnValue(mockRange);
    (store.getState as jest.Mock).mockReturnValue(mockState);
    mockAccumulators.calendarsToRefresh = new Map<string, any>();
    mockAccumulators.calendarsToHide = new Set();
    mockAccumulators.currentDebouncePeriod = 0;
    mockAccumulators.debouncedUpdateFn = jest.fn();
  });

  it("should not dispatch for non-object messages", () => {
    updateCalendars(null, mockDispatch, mockAccumulators);
    updateCalendars("string", mockDispatch, mockAccumulators);
    updateCalendars(123, mockDispatch, mockAccumulators);

    expect(refreshCalendarWithSyncToken).not.toHaveBeenCalled();
  });

  it("should dispatch for registered calendars", async () => {
    const message = {
      [WS_INBOUND_EVENTS.CLIENT_REGISTERED]: [
        "/calendars/cal1/entry1",
        "/calendars/cal2/entry2",
      ],
    };

    updateCalendars(message, mockDispatch, mockAccumulators);

    await waitFor(() =>
      expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(2)
    );
  });

  it("should dispatch for calendar path updates", async () => {
    const message = {
      "/calendars/cal1/entry1": { updated: true },
    };

    updateCalendars(message, mockDispatch, mockAccumulators);
    await waitFor(() =>
      expect(refreshCalendarWithSyncToken).toHaveBeenCalled()
    );
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledWith({
      calendar: mockState.calendars.list["cal1/entry1"],
      calType: undefined,
      calendarRange: mockRange,
    });
  });

  it("should use displayed calendar range", async () => {
    const message = {
      "/calendars/cal1/entry1": {},
    };

    updateCalendars(message, mockDispatch, mockAccumulators);
    await waitFor(() => expect(getDisplayedCalendarRange).toHaveBeenCalled());
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

    updateCalendars(message, mockDispatch, mockAccumulators);

    await waitFor(() =>
      expect(refreshCalendarWithSyncToken).toHaveBeenCalledWith({
        calendar: stateWithTemp.calendars.templist["temp1/entry1"],
        calType: "temp",
        calendarRange: mockRange,
      })
    );
  });

  it("should handle invalid calendar paths gracefully", () => {
    const message = {
      "/invalid/path": {},
      "not-a-path": {},
    };

    updateCalendars(message, mockDispatch, mockAccumulators);

    expect(refreshCalendarWithSyncToken).not.toHaveBeenCalled();
  });
});
