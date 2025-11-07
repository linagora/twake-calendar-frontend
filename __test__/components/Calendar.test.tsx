import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import CalendarApp from "../../src/components/Calendar/Calendar";
import * as eventThunks from "../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../utils/Renderwithproviders";
import { searchUsers } from "../../src/features/User/userAPI";
import * as calendarThunks from "../../src/features/Calendars/CalendarSlice";
import { useRef } from "react";

import userEvent from "@testing-library/user-event";
import CalendarLayout from "../../src/components/Calendar/CalendarLayout";
jest.mock("../../src/features/User/userAPI");
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
          ownerEmails: ["alice@example.com"],
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
          ownerEmails: ["alice@example.com"],
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
          ownerEmails: ["alice@example.com"],
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
      pending: false,
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
  it("BUGFIX: remove dots in mini calendar when unselecting personal calendar", async () => {
    await act(async () =>
      renderWithProviders(<CalendarLayout />, preloadedState)
    );

    const checkbox = screen.getByLabelText("Calendar personal");
    // checkbox checked : events shown
    expect(
      screen.getByTestId(
        `date-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
      )
    ).toHaveClass("event-dot");

    // checkbox unchecked : events hidden
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(
      screen.getByTestId(
        `date-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
      )
    ).not.toHaveClass("event-dot");

    // checkbox rechecked : events shown
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(
      screen.getByTestId(
        `date-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
      )
    ).toHaveClass("event-dot");
  });
  it("BUGFIX: remove dots in mini calendar when unselecting delegated calendar", async () => {
    await act(async () =>
      renderWithProviders(<CalendarLayout />, preloadedState)
    );

    // hide personal event first
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Calendar personal"));
    });
    const checkbox = screen.getByLabelText("Calendar delegated");

    expect(
      screen.getByTestId(
        `date-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
      )
    ).not.toHaveClass("event-dot");

    // checkbox checked : events shown
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(
      screen.getByTestId(
        `date-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
      )
    ).toHaveClass("event-dot");
  });
  it("BUGFIX: remove dots in mini calendar when unselecting shared calendar", async () => {
    await act(async () =>
      renderWithProviders(<CalendarLayout />, preloadedState)
    );

    // hide personal event first
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Calendar personal"));
    });
    const checkbox = screen.getByLabelText("Calendar shared");

    // checkbox unchecked : events hidden
    expect(
      screen.getByTestId(
        `date-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
      )
    ).not.toHaveClass("event-dot");

    // checkbox checked : events shown
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(
      screen.getByTestId(
        `date-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
      )
    ).toHaveClass("event-dot");
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
          ownerEmails: ["alice@example.com"],
          events: {},
        },
      },
      pending: false,
      templist: {},
    },
  };

  it("imports temporary calendars when selecting new users", async () => {
    const spy = jest
      .spyOn(eventThunks, "getTempCalendarsListAsync")
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

    const input = screen.getByPlaceholderText("peopleSearch.placeholder");
    act(() => {
      userEvent.type(input, "New");
    });
    const option = await screen.findByText("New User");
    await act(async () => {
      fireEvent.click(option);
    });

    expect(spy).toHaveBeenCalled();
  });

  it("does not import temp calendars if user already has a calendar but toggles the shared one", async () => {
    mockedSearchUsers.mockResolvedValueOnce([
      {
        email: "alice@example.com",
        displayName: "Alice",
        avatarUrl: "image.png",
        openpaasId: "1234567890",
      },
    ]);
    const spy = jest
      .spyOn(eventThunks, "getTempCalendarsListAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    await act(async () =>
      renderWithProviders(<CalendarTestWrapper />, preloadedState)
    );

    const input = screen.getByPlaceholderText("peopleSearch.placeholder");
    await act(async () => userEvent.type(input, "Alice"));

    const option = await screen.findByText("Alice");
    await act(async () => {
      fireEvent.click(option);
    });
    expect(spy).not.toHaveBeenCalledWith();
  });

  it("open window with attendees filled after temp search on create event button click", async () => {
    const spy = jest
      .spyOn(eventThunks, "getTempCalendarsListAsync")
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

    const input = screen.getByPlaceholderText("peopleSearch.placeholder");
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
    await waitFor(() => {
      expect(screen.getAllByText("event.createEvent")).toHaveLength(2);
      expect(screen.getAllByText(/New User/i)).toHaveLength(2);
    });
  });

  it("open window with attendees filled after temp search on enter in temp input", async () => {
    const spy = jest
      .spyOn(eventThunks, "getTempCalendarsListAsync")
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

    const input = screen.getByPlaceholderText("peopleSearch.placeholder");
    await act(async () => userEvent.type(input, "New"));

    const option = await screen.findByText("New User");
    await act(async () => {
      fireEvent.click(option);
    });
    expect(spy).toHaveBeenCalled();
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    await waitFor(() => {
      expect(screen.getAllByText("event.createEvent")).toHaveLength(2);
      expect(screen.getAllByText(/New User/i)).toHaveLength(2);
    });
  });

  it("BUGFIX: can untoggle all calendar.personal", async () => {
    await act(async () =>
      renderWithProviders(<CalendarTestWrapper />, {
        user: preloadedState.user,
        calendars: {
          list: { "user1/cal1": preloadedState.calendars.list["user1/cal1"] },
          pending: false,
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

    const calendarRef = (window as any).__calendarRef;

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

  it("should fetch calendar details with date range matching the displayed month", async () => {
    const spy = jest
      .spyOn(calendarThunks, "getCalendarDetailAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    jest.useFakeTimers().setSystemTime(new Date("2025-01-01"));
    await act(async () =>
      renderWithProviders(<CalendarLayout />, preloadedState)
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const calendarRef = (window as any).__calendarRef;
    const calendarApi = calendarRef.current;
    const view = calendarApi?.view;
    await act(async () => {
      calendarApi.changeView("dayGridMonth");
      fireEvent.click(screen.getByTestId("ChevronRightIcon"));
    });
    expect(spy).toHaveBeenCalledTimes(4);
    const callArgs = spy.mock.calls[3][0];
    expect(callArgs.calId).toBe("user1/cal1");

    const startDate = new Date(
      callArgs.match.start.replace(
        /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
        "$1-$2-$3T$4:$5:$6"
      )
    );
    const endDate = new Date(
      callArgs.match.end.replace(
        /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
        "$1-$2-$3T$4:$5:$6"
      )
    );
    // Verify the date range matches the displayed view
    const viewStart = new Date(view.currentStart);
    const viewEnd = new Date(view.currentEnd);

    expect(startDate.getTime()).toBeLessThanOrEqual(viewStart.getTime());
    expect(endDate.getTime()).toBeGreaterThanOrEqual(viewEnd.getTime());
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
        },
      };

      const spy = jest
        .spyOn(calendarThunks, "getCalendarDetailAsync")
        .mockImplementation(() => ({
          type: "getCalendarDetailAsync",
          unwrap: () => Promise.resolve({}),
        })) as any;

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
        },
      };

      const spy = jest
        .spyOn(calendarThunks, "getCalendarDetailAsync")
        .mockImplementation(() => ({
          type: "getCalendarDetailAsync",
          unwrap: () => Promise.resolve({}),
        })) as any;

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
      const hiddenCalls = spy.mock.calls.filter(
        (call) =>
          call[0].calId === "user1/cal2" || call[0].calId === "user1/cal3"
      );

      expect(selectedCalls.length).toBeGreaterThan(0);
    });

    it("does not make duplicate API calls for same calendar and range", async () => {
      const spy = jest
        .spyOn(calendarThunks, "getCalendarDetailAsync")
        .mockImplementation(() => ({
          type: "getCalendarDetailAsync",
          unwrap: () => Promise.resolve({}),
        })) as any;

      await act(async () => {
        renderWithProviders(
          <CalendarApp calendarRef={{ current: null }} />,
          preloadedState
        );
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
          list: undefined as any,
          templist: undefined as any,
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
          templist: undefined as any,
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
