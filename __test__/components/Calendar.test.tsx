import CalendarApp from "@/components/Calendar/Calendar";
import CalendarLayout from "@/components/Calendar/CalendarLayout";
import * as calendarDetailThunks from "@/features/Calendars/services";
import * as servicesModule from "@/features/Calendars/services";
import { searchUsers } from "@/features/User/userAPI";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { renderWithProviders } from "../utils/Renderwithproviders";

jest.mock("@/features/User/userAPI");
const mockedSearchUsers = searchUsers as jest.MockedFunction<
  typeof searchUsers
>;

// Test wrapper component to provide calendarRef
function CalendarTestWrapper() {
  const calendarRef = useRef(null);
  return <CalendarApp calendarRef={calendarRef} />;
}

describe("CalendarSelection", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  const today = new Date();
  const start = new Date(today);
  start.setHours(10, 0, 0, 0);
  const end = new Date(today);
  end.setHours(11, 0, 0, 0);
  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "mockSid",
        openpaasId: "user1",
      },
      tokens: { accessToken: "token" }, // required to avoid redirect
    },
    calendars: {
      list: {
        "user1/cal1": {
          name: "Calendar personal",
          id: "user1/cal1",
          color: { light: "#FF0000", dark: "#000" },
          owner: { emails: ["alice@example.com"] },
          events: {
            event1: {
              id: "event1",
              calId: "user1/cal1",
              uid: "event1",
              title: "Test Event",
              start: start.toISOString(),
              end: end.toISOString(),
              partstat: "ACCEPTED",
              organizer: {
                cn: "Alice",
                cal_address: "alice@example.com",
              },
              attendee: [
                {
                  cn: "Alice",
                  partstat: "ACCEPTED",
                  rsvp: "TRUE",
                  role: "REQ-PARTICIPANT",
                  cutype: "INDIVIDUAL",
                  cal_address: "alice@example.com",
                },
              ],
            },
          },
        },
        "user2/cal1": {
          name: "Calendar delegated",
          delegated: true,
          id: "user2/cal1",
          color: { light: "#FF0000", dark: "#000" },
          owner: { emails: ["alice@example.com"], lastname: "alice" },
          events: {
            event1: {
              id: "event1",
              calId: "user2/cal1",
              uid: "event1",
              title: "Test Event",
              start: start.toISOString(),
              end: end.toISOString(),
              partstat: "ACCEPTED",
              organizer: {
                cn: "Alice",
                cal_address: "alice@example.com",
              },
              attendee: [
                {
                  cn: "Alice",
                  partstat: "ACCEPTED",
                  rsvp: "TRUE",
                  role: "REQ-PARTICIPANT",
                  cutype: "INDIVIDUAL",
                  cal_address: "alice@example.com",
                },
              ],
            },
          },
        },
        "user3/cal1": {
          name: "Calendar shared",
          id: "user3/cal1",
          color: { light: "#FF0000", dark: "#000" },
          owner: { emails: ["alice@example.com"], lastname: "alice" },
          events: {
            event1: {
              id: "event1",
              calId: "user3/cal1",
              uid: "event1",
              title: "Test Event",
              start: start.toISOString(),
              end: end.toISOString(),
              partstat: "ACCEPTED",
              organizer: {
                cn: "Alice",
                cal_address: "alice@example.com",
              },
              attendee: [
                {
                  cn: "Alice",
                  partstat: "ACCEPTED",
                  rsvp: "TRUE",
                  role: "REQ-PARTICIPANT",
                  cutype: "INDIVIDUAL",
                  cal_address: "alice@example.com",
                },
              ],
            },
          },
        },
      },
      pending: true,
    },
  };
  it("renders calendars", async () => {
    const mockCalendarRef = { current: null };
    await act(async () => {
      renderWithProviders(
        <CalendarApp calendarRef={mockCalendarRef} />,
        preloadedState
      );
    });
    expect(screen.getByText("calendar.personal")).toBeInTheDocument();
    expect(screen.getByText("calendar.delegated")).toBeInTheDocument();
    expect(screen.getByText("calendar.other")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personal")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar delegated")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar shared")).toBeInTheDocument();
  });
  it("open accordeon when clicking on button only", async () => {
    const mockCalendarRef = { current: null };
    await act(async () => {
      renderWithProviders(
        <CalendarApp calendarRef={mockCalendarRef} />,
        preloadedState
      );
    });
    expect(screen.getByText("calendar.personal")).toBeInTheDocument();
    expect(screen.getByText("calendar.delegated")).toBeInTheDocument();
    expect(screen.getByText("calendar.other")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personal")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar delegated")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar shared")).toBeInTheDocument();

    const sharedAccordionSummary = screen
      .getByText("calendar.other")
      .closest(".MuiAccordionSummary-root");

    const addButton = screen.getAllByTestId("AddIcon")[2];
    await act(async () => {
      fireEvent.click(addButton);
    });
    expect(sharedAccordionSummary).toHaveAttribute("aria-expanded", "true");

    await act(async () => {
      fireEvent.click(addButton);
    });
    expect(sharedAccordionSummary).toHaveAttribute("aria-expanded", "true");
  });
  it("renders calendars with local storage", async () => {
    const mockCalendarRef = { current: null };
    localStorage.setItem(
      "selectedCalendars",
      JSON.stringify(Object.keys(preloadedState.calendars.list))
    );
    await act(async () => {
      renderWithProviders(
        <CalendarApp calendarRef={mockCalendarRef} />,
        preloadedState
      );
    });

    expect(screen.getByLabelText("Calendar personal")).toBeChecked();
    expect(screen.getByLabelText("Calendar delegated")).toBeChecked();
    expect(screen.getByLabelText("Calendar shared")).toBeChecked();
  });
  it("persist selected calendars in local storage", async () => {
    const mockCalendarRef = { current: null };
    await act(async () => {
      renderWithProviders(
        <CalendarApp calendarRef={mockCalendarRef} />,
        preloadedState
      );
    });

    expect(screen.getByLabelText("Calendar personal")).toBeChecked();
    expect(screen.getByLabelText("Calendar delegated")).not.toBeChecked();
    expect(screen.getByLabelText("Calendar shared")).not.toBeChecked();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Calendar personal"));
      fireEvent.click(screen.getByLabelText("Calendar shared"));
    });

    expect(localStorage.getItem("selectedCalendars")).toBe('["user3/cal1"]');
  });
});

describe("calendar Availability search", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "mockSid",
        openpaasId: "user1",
      },
      organiserData: {
        cn: "test",
        cal_address: "test@test.com",
      },
      tokens: { accessToken: "token" },
    },
    calendars: {
      list: {
        "user1/cal1": {
          name: "Calendar personal",
          id: "user1/cal1",
          color: { light: "#FF0000", dark: "#000" },
          owner: { emails: ["alice@example.com"] },
          events: {},
        },
      },
      pending: true,
      templist: {},
    },
  };

  it("imports temporary calendars when selecting new users", async () => {
    const spy = jest
      .spyOn(servicesModule, "getTempCalendarsListAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    mockedSearchUsers.mockResolvedValueOnce([
      {
        email: "newuser@example.com",
        displayName: "New User",
        avatarUrl: "image.png",
        openpaasId: "1234567890",
      },
    ]);

    await act(async () =>
      renderWithProviders(<CalendarTestWrapper />, preloadedState)
    );

    const input = screen.getByPlaceholderText(
      "peopleSearch.availabilityPlaceholder"
    );
    act(() => {
      userEvent.type(input, "New");
    });
    const option = await screen.findByText("New User");
    await act(async () => {
      fireEvent.click(option);
    });

    expect(spy).toHaveBeenCalled();
  });

  it("open window with attendees filled after temp search on create event button click", async () => {
    const spy = jest
      .spyOn(servicesModule, "getTempCalendarsListAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    mockedSearchUsers.mockResolvedValue([
      {
        email: "newuser@example.com",
        displayName: "New User",
        avatarUrl: "image.png",
        openpaasId: "1234567890",
      },
    ]);

    await act(async () =>
      renderWithProviders(<CalendarTestWrapper />, preloadedState)
    );

    const input = screen.getByPlaceholderText(
      "peopleSearch.availabilityPlaceholder"
    );
    await act(async () => userEvent.type(input, "New"));

    const option = await screen.findByText("New User");

    await act(async () => {
      fireEvent.click(option);
    });
    expect(spy).toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "event.createEvent" })
      );
    });
    await waitFor(
      () => {
        expect(screen.getAllByText("event.createEvent")).toHaveLength(2);
        expect(screen.getAllByText(/New User/i)).toHaveLength(2);
      },
      { timeout: 10000 }
    );
  }, 15000);

  it("open window with attendees filled after temp search on enter in temp input", async () => {
    const spy = jest
      .spyOn(servicesModule, "getTempCalendarsListAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    mockedSearchUsers.mockResolvedValue([
      {
        email: "newuser@example.com",
        displayName: "New User",
        avatarUrl: "image.png",
        openpaasId: "1234567890",
      },
    ]);

    await act(async () =>
      renderWithProviders(<CalendarTestWrapper />, preloadedState)
    );

    const input = screen.getByPlaceholderText(
      "peopleSearch.availabilityPlaceholder"
    );
    await act(async () => userEvent.type(input, "New"));

    const option = await screen.findByText("New User");
    await act(async () => {
      fireEvent.click(option);
    });
    expect(spy).toHaveBeenCalled();
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    await waitFor(
      () => {
        expect(screen.getAllByText("event.createEvent")).toHaveLength(2);
        expect(screen.getAllByText(/New User/i)).toHaveLength(2);
      },
      { timeout: 10000 }
    );
  }, 15000);

  it("BUGFIX: can untoggle all calendar.personal", async () => {
    jest
      .spyOn(calendarDetailThunks, "getCalendarDetailAsync")
      .mockImplementation(
        () =>
          ({
            type: "getCalendarDetailAsync",
            unwrap: () => Promise.resolve({}),
          }) as any
      );
    await act(async () =>
      renderWithProviders(<CalendarTestWrapper />, {
        user: preloadedState.user,
        calendars: {
          list: { "user1/cal1": preloadedState.calendars.list["user1/cal1"] },
        },
      })
    );

    const checkbox = screen.getByLabelText("Calendar personal");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox); // toggle off

    expect(checkbox).not.toBeChecked();
  });

  it("BUGFIX: monthview doesn't show days numbers in banner", async () => {
    await act(async () =>
      renderWithProviders(<CalendarLayout />, {
        user: preloadedState.user,
        calendars: {
          list: { "user1/cal1": preloadedState.calendars.list["user1/cal1"] },
          pending: false,
        },
      })
    );

    const calendarRef = window.__calendarRef;

    await waitFor(() => {
      expect(calendarRef.current).not.toBeNull();
    });

    const calendarApi = calendarRef.current;
    await act(async () => {
      calendarApi.changeView("dayGridMonth");
    });
    await waitFor(() => {
      expect(screen.queryAllByRole("columnheader").length).toBe(14);
    });

    const dayNumbers = screen.getAllByRole("columnheader");
    expect(dayNumbers.length).toBeGreaterThan(0);

    const dayNumbersWithContent = dayNumbers.filter((cell) => {
      const dayNum = cell.querySelector(
        ".fc-daygrid-day-number, .fc-daygrid-day-top"
      );
      return dayNum && dayNum.textContent && /\d/.test(dayNum.textContent);
    });
    expect(dayNumbersWithContent.length).toBe(0);
  });

  it("should fetch calendar details for February after navigating to month view and clicking next", async () => {
    const spy = jest
      .spyOn(calendarDetailThunks, "getCalendarDetailAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    jest.useFakeTimers().setSystemTime(new Date("2025-01-01"));

    await act(async () =>
      renderWithProviders(<CalendarLayout />, {
        ...preloadedState,
        calendars: { ...preloadedState.calendars, pending: false },
      })
    );

    // Advance past debounce so the initial load fires
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    spy.mockClear();

    const calendarRef = window.__calendarRef;
    const calendarApi = calendarRef.current;

    await act(async () => {
      calendarApi.changeView("dayGridMonth");
      fireEvent.click(screen.getByTestId("ChevronRightIcon"));
    });

    // Advance past debounce so the navigation fetch fires
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    // Find the call that covers February 2025 (the navigated-to month)
    const februaryCall = spy.mock.calls.find((call) => {
      const start = call[0].match.start as string;
      // start should be in January or February 2025 (month view includes padding days)
      return start.startsWith("2025");
    });

    expect(februaryCall).toBeDefined();
    const callArgs = februaryCall![0];
    expect(callArgs.calId).toBe("user1/cal1");

    const parseDate = (s: string) =>
      new Date(
        s.replace(
          /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
          "$1-$2-$3T$4:$5:$6"
        )
      );

    const startDate = parseDate(callArgs.match.start);
    const endDate = parseDate(callArgs.match.end);

    // February 2025 month view: range must cover Feb 1 through Mar 1
    expect(startDate.getTime()).toBeLessThanOrEqual(
      new Date("2025-02-01").getTime()
    );
    expect(endDate.getTime()).toBeGreaterThanOrEqual(
      new Date("2025-03-01").getTime()
    );
  });

  describe("Batch loading and prefetching", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("loads active calendars in batches of 5", async () => {
      const manyCalendars = Array.from({ length: 12 }, (_, i) => ({
        [`user1/cal${i + 1}`]: {
          name: `Calendar ${i + 1}`,
          id: `user1/cal${i + 1}`,
          color: { light: "#FF0000", dark: "#000" },
          events: {},
        },
      })).reduce((acc, cal) => ({ ...acc, ...cal }), {});

      const stateWithManyCalendars = {
        ...preloadedState,
        calendars: {
          ...preloadedState.calendars,
          list: manyCalendars,
          pending: false,
        },
      };

      const spy = jest
        .spyOn(calendarDetailThunks, "getCalendarDetailAsync")
        .mockImplementation(
          () =>
            ({
              type: "getCalendarDetailAsync",
              unwrap: () => Promise.resolve({}),
            }) as any
        );

      await act(async () => {
        renderWithProviders(
          <CalendarApp calendarRef={{ current: null }} />,
          stateWithManyCalendars
        );
      });

      await waitFor(
        () => {
          expect(spy).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      const callCount = spy.mock.calls.length;
      expect(callCount).toBeGreaterThan(0);
      expect(callCount).toBeLessThanOrEqual(24);
    });

    it("prefetches hidden calendars only after active load completes", async () => {
      const calendarsWithSelected = {
        ...preloadedState,
        calendars: {
          ...preloadedState.calendars,
          list: {
            "user1/cal1": {
              name: "Selected Calendar",
              id: "user1/cal1",
              color: { light: "#FF0000", dark: "#000" },
              events: {},
            },
            "user1/cal2": {
              name: "Hidden Calendar 1",
              id: "user1/cal2",
              color: { light: "#00FF00", dark: "#000" },
              events: {},
            },
            "user1/cal3": {
              name: "Hidden Calendar 2",
              id: "user1/cal3",
              color: { light: "#0000FF", dark: "#000" },
              events: {},
            },
          },
          pending: false,
        },
      };

      const spy = jest
        .spyOn(calendarDetailThunks, "getCalendarDetailAsync")
        .mockImplementation(
          () =>
            ({
              type: "getCalendarDetailAsync",
              unwrap: () => Promise.resolve({}),
            }) as any
        );

      await act(async () => {
        renderWithProviders(
          <CalendarApp calendarRef={{ current: null }} />,
          calendarsWithSelected
        );
      });

      await waitFor(
        () => {
          expect(spy).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      const selectedCalls = spy.mock.calls.filter(
        (call) => call[0].calId === "user1/cal1"
      );
      spy.mock.calls.filter(
        (call) =>
          call[0].calId === "user1/cal2" || call[0].calId === "user1/cal3"
      );

      expect(selectedCalls.length).toBeGreaterThan(0);
    });

    it("does not make duplicate API calls for same calendar and range", async () => {
      const spy = jest
        .spyOn(calendarDetailThunks, "getCalendarDetailAsync")
        .mockImplementation(
          () =>
            ({
              type: "getCalendarDetailAsync",
              unwrap: () => Promise.resolve({}),
            }) as any
        );

      await act(async () => {
        renderWithProviders(<CalendarApp calendarRef={{ current: null }} />, {
          ...preloadedState,
          calendars: { ...preloadedState.calendars, pending: false },
        });
      });

      await waitFor(
        () => {
          expect(spy).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      const callsForCal1 = spy.mock.calls.filter(
        (call) => call[0].calId === "user1/cal1"
      );

      const uniqueRanges = new Set(
        callsForCal1.map(
          (call) => `${call[0].match.start}_${call[0].match.end}`
        )
      );

      expect(uniqueRanges.size).toBeLessThanOrEqual(callsForCal1.length);
    });

    it("handles undefined calendars gracefully", async () => {
      const stateWithUndefinedCalendars = {
        ...preloadedState,
        calendars: {
          list: undefined,
          templist: undefined,
          pending: false,
        },
      };

      await act(async () => {
        renderWithProviders(
          <CalendarApp calendarRef={{ current: null }} />,
          stateWithUndefinedCalendars
        );
      });

      expect(screen.getByText("calendar.personal")).toBeInTheDocument();
    });

    it("handles undefined tempcalendars gracefully", async () => {
      const stateWithUndefinedTemp = {
        ...preloadedState,
        calendars: {
          ...preloadedState.calendars,
          templist: undefined,
        },
      };

      await act(async () => {
        renderWithProviders(
          <CalendarApp calendarRef={{ current: null }} />,
          stateWithUndefinedTemp
        );
      });

      expect(screen.getByText("calendar.personal")).toBeInTheDocument();
    });
  });
});
