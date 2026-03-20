import CalendarLayout from "@/components/Calendar/CalendarLayout";
import { act, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../utils/Renderwithproviders";

const PIVOT_UTC = new Date("2026-03-16T17:00:00Z");

const makeState = (timezone: string) => ({
  user: {
    userData: {
      sub: "test",
      email: "test@test.com",
      sid: "mockSid",
      openpaasId: "user1",
    },
    tokens: { accessToken: "token" },
  },
  settings: { view: "calendar", timeZone: timezone },
  calendars: {
    list: {
      "user1/cal1": {
        name: "Calendar personal",
        id: "user1/cal1",
        color: { light: "#FF0000", dark: "#000" },
        owner: { emails: ["test@test.com"] },
        events: {},
      },
    },
    pending: false,
  },
});

describe("Calendar – dayHeaderContent respects selected timezone", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  async function renderAtPivotTime(timezone: string): Promise<string[]> {
    // Set fake timers the same way the working test does — single chained call
    jest.useFakeTimers().setSystemTime(PIVOT_UTC);

    await act(async () => {
      renderWithProviders(<CalendarLayout />, makeState(timezone));
    });

    // Advance past the debounce (300ms) like the working navigation test does
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    const calendarRef = window.__calendarRef;
    await waitFor(() => expect(calendarRef?.current).not.toBeNull());

    await act(async () => {
      calendarRef.current?.changeView("timeGridWeek");
    });

    await waitFor(() => {
      expect(document.querySelectorAll(".fc-col-header-cell").length).toBe(7);
    });

    return Array.from(document.querySelectorAll(".fc-col-header-cell")).map(
      (cell) => cell.textContent ?? ""
    );
  }

  it("UTC: Monday March 16 column exists", async () => {
    const cells = await renderAtPivotTime("UTC");
    const monday = cells.find((t) => t.includes("16"));
    expect(monday).toBeDefined();
    expect(monday).toMatch(/MON/i);
  });

  it("Europe/Paris: Monday March 16 column exists (UTC+1, no day shift)", async () => {
    const cells = await renderAtPivotTime("Europe/Paris");
    const monday = cells.find((t) => t.includes("16"));
    expect(monday).toBeDefined();
    expect(monday).toMatch(/MON/i);
  });

  it("Asia/Jakarta: Tuesday March 17 column exists (UTC+7, day shifts forward)", async () => {
    const cells = await renderAtPivotTime("Asia/Jakarta");
    const tuesday = cells.find((t) => t.includes("17"));
    expect(tuesday).toBeDefined();
    expect(tuesday).toMatch(/TUE/i);
  });

  it("Asia/Jakarta: no column incorrectly labeled MON 17 – regression", async () => {
    const cells = await renderAtPivotTime("Asia/Jakarta");
    const wrongCell = cells.find((t) => t.includes("17") && /MON/i.test(t));
    expect(wrongCell).toBeUndefined();
  });

  it("Asia/Tokyo: Tuesday March 17 column exists (UTC+9)", async () => {
    const cells = await renderAtPivotTime("Asia/Tokyo");
    const tuesday = cells.find((t) => t.includes("17"));
    expect(tuesday).toBeDefined();
    expect(tuesday).toMatch(/TUE/i);
  });

  it("America/New_York: Monday March 16 column exists (UTC-4, no day shift)", async () => {
    const cells = await renderAtPivotTime("America/New_York");
    const monday = cells.find((t) => t.includes("16"));
    expect(monday).toBeDefined();
    expect(monday).toMatch(/MON/i);
  });
});
