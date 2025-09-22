import { fireEvent, screen, waitFor } from "@testing-library/react";
import CalendarApp from "../../src/components/Calendar/Calendar";
import * as eventThunks from "../../src/features/Calendars/CalendarSlice";
import { renderWithProviders } from "../utils/Renderwithproviders";
import { searchUsers } from "../../src/features/User/userAPI";

import userEvent from "@testing-library/user-event";
jest.mock("../../src/features/User/userAPI");
const mockedSearchUsers = searchUsers as jest.MockedFunction<
  typeof searchUsers
>;

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
    renderWithProviders(<CalendarApp />, preloadedState);
    expect(screen.getByText("Personnal Calendars")).toBeInTheDocument();
    expect(screen.getByText("Delegated Calendars")).toBeInTheDocument();
    expect(screen.getByText("Other Calendars")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personnal")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar delegated")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar shared")).toBeInTheDocument();
  });
  it("refresh calendars", async () => {
    const spy = jest
      .spyOn(eventThunks, "getCalendarDetailAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    renderWithProviders(<CalendarApp />, preloadedState);

    const refreshButton = screen.getByRole("button", {
      name: "↻",
    });

    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
  });
  it("open accordeon when clicking on button only", () => {
    renderWithProviders(<CalendarApp />, preloadedState);
    expect(screen.getByText("Personnal Calendars")).toBeInTheDocument();
    expect(screen.getByText("Delegated Calendars")).toBeInTheDocument();
    expect(screen.getByText("Other Calendars")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personnal")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar delegated")).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar shared")).toBeInTheDocument();

    const delegatedAccordionSummary = screen
      .getByText("Delegated Calendars")
      .closest(".MuiAccordionSummary-root");

    const addButton = screen.getAllByTestId("AddIcon")[1];
    fireEvent.click(addButton);
    expect(delegatedAccordionSummary).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(addButton);
    expect(delegatedAccordionSummary).toHaveAttribute("aria-expanded", "true");
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
        openpaasId: "1234567890",
      },
    ]);

    renderWithProviders(<CalendarApp />, preloadedState);

    const input = screen.getByPlaceholderText(/search user/i);
    userEvent.type(input, "New");

    const option = await screen.findByText("New User");
    fireEvent.click(option);

    expect(spy).toHaveBeenCalled();
  });

  it("does not import temp calendars if user already has a calendar but toggles the shared one", async () => {
    mockedSearchUsers.mockResolvedValueOnce([
      { email: "alice@example.com", displayName: "Alice" },
    ]);
    const spy = jest
      .spyOn(eventThunks, "getTempCalendarsListAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    renderWithProviders(<CalendarApp />, preloadedState);

    const input = screen.getByPlaceholderText(/search user/i);
    userEvent.type(input, "Alice");

    const option = await screen.findByText("Alice");
    fireEvent.click(option);

    expect(spy).not.toHaveBeenCalledWith();
  });
});
