import { RootState, store } from "@/app/store";
import { getDisplayedCalendarRange } from "@/utils";
import { updateCalendars } from "@/websocket/messaging";
jest.mock("@/features/Calendars/services/refreshCalendar");

jest.mock("@/utils/CalendarRangeManager");
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
beforeEach(() => {
  jest.clearAllMocks();
  (getDisplayedCalendarRange as jest.Mock).mockReturnValue(mockRange);
  (store.getState as jest.Mock).mockReturnValue(mockState);
});
test("debounces calendar updates during message storm", () => {
  const mockMessage = {
    "/calendars/cal1/entry1": {
      syncToken: "ldsk",
    },
  };

  // Send 100 messages rapidly
  for (let i = 0; i < 100; i++) {
    updateCalendars(mockMessage, mockDispatch);
  }

  // Dispatch should NOT have been called yet
  expect(mockDispatch).not.toHaveBeenCalled();

  // Fast-forward time by 500ms
  jest.advanceTimersByTime(500);

  // Now dispatch should be called only once
  expect(mockDispatch).toHaveBeenCalledTimes(1);
});

test("debounces calendar updates during message storm with multiple updates", () => {
  // Send a storm with mixed messages
  for (let i = 0; i < 100; i++) {
    if (i % 3 === 0)
      updateCalendars(
        { "/calendars/cal/A": { syncToken: "ldskfjsld" + i } },
        mockDispatch
      );
    else if (i % 3 === 1)
      updateCalendars(
        { "/calendars/cal/B": { syncToken: "ldskfjsld" + i } },
        mockDispatch
      );
    else
      updateCalendars(
        { "/calendars/cal/C": { syncToken: "ldskfjsld" + i } },
        mockDispatch
      );
  }

  // Dispatch should NOT have been called yet
  expect(mockDispatch).not.toHaveBeenCalled();

  // Fast-forward time by 500ms
  jest.advanceTimersByTime(500);

  // Now dispatch should be called only once per calendar
  expect(mockDispatch).toHaveBeenCalledTimes(3);
});
