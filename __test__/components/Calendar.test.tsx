import { fireEvent, screen, waitFor } from "@testing-library/react";
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
          name: "Calendar personnal",
          id: "user1/cal1",
          color: "#FF0000",
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
          color: "#FF0000",
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
          color: "#FF0000",
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
    renderWithProviders(
      <CalendarApp calendarRef={mockCalendarRef} />,
      preloadedState
    );
    expect(screen.getByText("Personnal Calendars")).toBeInTheDocument();
    expect(screen.getByText("Delegated Calendars")).toBeInTheDocument();
    expect(screen.getByText("Other Calendars")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personnal")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar delegated")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar shared")).toBeInTheDocument();
  });
  it("open accordeon when clicking on button only", () => {
    const mockCalendarRef = { current: null };
    renderWithProviders(
      <CalendarApp calendarRef={mockCalendarRef} />,
      preloadedState
    );
    expect(screen.getByText("Personnal Calendars")).toBeInTheDocument();
    expect(screen.getByText("Delegated Calendars")).toBeInTheDocument();
    expect(screen.getByText("Other Calendars")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personnal")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar delegated")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar shared")).toBeInTheDocument();

    const sharedAccordionSummary = screen
      .getByText("Other Calendars")
      .closest(".MuiAccordionSummary-root");

    const addButton = screen.getAllByTestId("AddIcon")[2];
    fireEvent.click(addButton);
    expect(sharedAccordionSummary).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(addButton);
    expect(sharedAccordionSummary).toHaveAttribute("aria-expanded", "true");
  });
});

describe("calendar Availability search", () => {
  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        sid: "mockSid",
        openpaasId: "user1",
      },
      tokens: { accessToken: "token" },
    },
    calendars: {
      list: {
        "user1/cal1": {
          name: "Calendar personnal",
          id: "user1/cal1",
          color: "#FF0000",
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

    renderWithProviders(<CalendarTestWrapper />, preloadedState);

    const input = screen.getByPlaceholderText(/start typing a name or email/i);
    userEvent.type(input, "New");

    const option = await screen.findByText("New User");
    fireEvent.click(option);

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
    renderWithProviders(<CalendarTestWrapper />, preloadedState);

    const input = screen.getByPlaceholderText(/start typing a name or email/i);
    userEvent.type(input, "Alice");

    const option = await screen.findByText("Alice");
    fireEvent.click(option);

    expect(spy).not.toHaveBeenCalledWith();
  });

  it("BUGFIX: can untoggle all personnal calendars", () => {
    renderWithProviders(<CalendarTestWrapper />, {
      user: preloadedState.user,
      calendars: {
        list: { "user1/cal1": preloadedState.calendars.list["user1/cal1"] },
        pending: false,
      },
    });

    const checkbox = screen.getByLabelText("Calendar personnal");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox); // toggle off

    expect(checkbox).not.toBeChecked();
  });

  it("BUGFIX: monthview doesn't show days numbers in banner", async () => {
    renderWithProviders(<CalendarLayout />, {
      user: preloadedState.user,
      calendars: {
        list: { "user1/cal1": preloadedState.calendars.list["user1/cal1"] },
        pending: false,
      },
    });

    const calendarRef = (window as any).__calendarRef;

    await waitFor(() => {
      expect(calendarRef.current).not.toBeNull();
    });

    const calendarApi = calendarRef.current;

    calendarApi.changeView("dayGridMonth");
    await waitFor(() => {
      expect(screen.queryAllByRole("columnheader").length).toBe(7);
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
    renderWithProviders(<CalendarLayout />, preloadedState);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    const calendarRef = (window as any).__calendarRef;
    const calendarApi = calendarRef.current;
    const view = calendarApi?.view;
    calendarApi.changeView("dayGridMonth");
    fireEvent.click(screen.getByTestId("ChevronRightIcon"));

    expect(spy).toHaveBeenCalledTimes(2);
    const callArgs = spy.mock.calls[1][0];
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
});
