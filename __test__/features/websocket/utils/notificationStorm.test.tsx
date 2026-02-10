import type { AppDispatch, RootState } from "@/app/store";
import { store } from "@/app/store";
import { refreshCalendarWithSyncToken } from "@/features/Calendars/services";
import { getDisplayedCalendarRange } from "@/utils";
import { updateCalendars } from "@/websocket/messaging/updateCalendars";

jest.mock("@/features/Calendars/services", () => ({
  refreshCalendarWithSyncToken: jest.fn(),
}));

jest.mock("@/utils", () => ({
  getDisplayedCalendarRange: jest.fn(),
  findCalendarById: jest.requireActual("@/utils").findCalendarById,
}));

jest.mock("@/app/store", () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.useFakeTimers();
const mockDispatch = jest.fn();
const mockRange = {
  start: new Date("2025-01-15T10:00:00Z"),
  end: new Date("2025-01-16T10:00:00Z"),
};
const mockState = {
  calendars: {
    list: {
      "cal1/entry1": { id: "cal1/entry1", name: "Calendar 1", syncToken: 1 },
      "cal2/entry2": { id: "cal2/entry2", name: "Calendar 2", syncToken: 1 },
      "cal/A": { id: "cal/A", name: "Cal A", syncToken: 1 },
      "cal/B": { id: "cal/B", name: "Cal B", syncToken: 1 },
      "cal/C": { id: "cal/C", name: "Cal C", syncToken: 1 },
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
  debouncedUpdateFn: undefined,
};

describe("websocket messages storm", () => {
  beforeEach(() => {
    (refreshCalendarWithSyncToken as unknown as jest.Mock).mockClear();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.resetModules();
    (getDisplayedCalendarRange as jest.Mock).mockReturnValue(mockRange);
    (store.getState as jest.Mock).mockReturnValue(mockState);
    window.WS_DEBOUNCE_PERIOD_MS = 500;
    mockAccumulators.calendarsToRefresh = new Map<string, any>();
    mockAccumulators.calendarsToHide = new Set();
    mockAccumulators.currentDebouncePeriod = 0;
    mockAccumulators.debouncedUpdateFn = undefined;
  });
  it("debounces calendar updates during message storm", () => {
    const mockMessage = {
      "/calendars/cal1/entry1": {
        syncToken: "ldsk",
      },
    };

    for (let i = 0; i < 50; i++) {
      updateCalendars(mockMessage, mockDispatch, mockAccumulators);
    }

    // Dispatch called once because of leading edge
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(1);

    // Trailing edge
    jest.advanceTimersByTime(500);

    // only one call for the last message + leading edge message
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(2);
  });

  it("debounces calendar updates during message storm with multiple updates", () => {
    // Send a storm with mixed messages
    for (let i = 0; i < 50; i++) {
      if (i % 3 === 0)
        updateCalendars(
          { "/calendars/cal/A": { syncToken: "ldskfjsld" + i } },
          mockDispatch,
          mockAccumulators
        );
      else if (i % 3 === 1)
        updateCalendars(
          { "/calendars/cal/B": { syncToken: "ldskfjsld" + i } },
          mockDispatch,
          mockAccumulators
        );
      else
        updateCalendars(
          { "/calendars/cal/C": { syncToken: "ldskfjsld" + i } },
          mockDispatch,
          mockAccumulators
        );
    }

    // Dispatch called once because of leading edge
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(1);

    // Trailing edge
    jest.advanceTimersByTime(500);

    // Trailing edge updates once per calendar + the original leading edge
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(4);
  });

  it("executes immediately when debounce is disabled", () => {
    window.WS_DEBOUNCE_PERIOD_MS = 0;

    updateCalendars(
      { "/calendars/cal1/entry1": { syncToken: "abc" } },
      mockDispatch,
      mockAccumulators
    );

    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(1);
  });
});
