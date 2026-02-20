import CalendarSelection from "@/components/Calendar/CalendarSelection";
import * as calendarThunks from "@/features/Calendars/services";
import "@testing-library/jest-dom";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/Renderwithproviders";

describe("CalendarSelection", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  const baseUser = {
    userData: {
      sub: "test",
      email: "test@test.com",
      sid: "mockSid",
      openpaasId: "user1",
    },
    tokens: { accessToken: "token" },
  };

  const calendarsMock = {
    "user1/cal1": {
      name: "Calendar personal",
      id: "user1/cal1",
      color: "#FF0000",
      owner: { emails: ["alice@example.com"], lastname: "alice" },
    },
    "user2/cal1": {
      name: "Calendar delegated",
      delegated: true,
      id: "user2/cal1",
      color: "#00FF00",
      owner: { emails: ["bob@example.com"], lastname: "bob" },
    },
    "user3/cal1": {
      name: "Calendar shared",
      id: "user3/cal1",
      color: "#0000FF",
      owner: { emails: ["charlie@example.com"], lastname: "charlie" },
    },
  };
  beforeAll(() => {
    jest.clearAllMocks();
    cleanup();
  });
  it("renders personal, delegated and calendar.other", () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={["user1/cal1"]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false },
      }
    );

    expect(screen.getByText("calendar.personal")).toBeInTheDocument();
    expect(screen.getByText("calendar.delegated")).toBeInTheDocument();
    expect(screen.getByText("calendar.other")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personal")).toBeChecked();
    expect(screen.getByLabelText("Calendar delegated - bob")).not.toBeChecked();
    expect(
      screen.getByLabelText("Calendar shared - charlie")
    ).not.toBeChecked();
  });

  it("toggles a calendar selection on click", () => {
    const setSelectedCalendars = jest.fn();

    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={setSelectedCalendars}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false },
      }
    );

    const checkbox = screen.getByLabelText("Calendar personal");
    fireEvent.click(checkbox);

    expect(setSelectedCalendars).toHaveBeenCalledWith(expect.any(Function));

    const updater = setSelectedCalendars.mock.calls[0][0];
    expect(updater([])).toEqual(["user1/cal1"]);
  });

  it("removes calendar from selection if already selected", () => {
    const setSelectedCalendars = jest.fn();

    renderWithProviders(
      <CalendarSelection
        selectedCalendars={["user1/cal1"]}
        setSelectedCalendars={setSelectedCalendars}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false },
      }
    );

    const checkbox = screen.getByLabelText("Calendar personal");
    fireEvent.click(checkbox);

    const updater = setSelectedCalendars.mock.calls[0][0];
    expect(updater(["user1/cal1"])).toEqual([]);
  });

  it("opens CalendarPopover modal when personal Add button is clicked", async () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false },
      }
    );

    const addButtons = screen.getAllByRole("button");
    fireEvent.click(addButtons[1]);

    await waitFor(() =>
      expect(
        screen.getByText("calendarPopover.tabs.addNew")
      ).toBeInTheDocument()
    );
  });

  it("Navigates to deletion dialog and deletes personal cal", async () => {
    const spy = jest
      .spyOn(calendarThunks, "removeCalendarAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false },
      }
    );

    const addButtons = screen.getAllByTestId("MoreHorizIcon");
    fireEvent.click(addButtons[0]);

    userEvent.click(screen.getByText(/delete/i));

    await waitFor(() =>
      expect(
        screen.getByText("calendar.delete.title(name=Calendar personal)")
      ).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it("Navigates to deletion dialog and deletes other cal", async () => {
    const spy = jest
      .spyOn(calendarThunks, "removeCalendarAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false },
      }
    );

    const addButtons = screen.getAllByTestId("MoreHorizIcon");
    fireEvent.click(addButtons[1]);

    userEvent.click(screen.getByText(/remove/i));

    await waitFor(() =>
      expect(
        screen.getByText("calendar.delete.title(name=Calendar delegated)")
      ).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it("opens CalendarSearch modal when Other Add button is clicked", () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false },
      }
    );

    const addButtons = screen.getAllByTestId("AddIcon");
    fireEvent.click(addButtons[1]); // seccond Add button (other)

    expect(
      screen.getByText("calendar.browseOtherCalendars")
    ).toBeInTheDocument();
  });

  it("when only calendar.personal are in the state, only calendar.personal and the title for other to be added are shown", () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: {
          list: {
            "user1/cal1": calendarsMock["user1/cal1"],
          },
          pending: false,
        },
      }
    );

    expect(screen.getByText("calendar.personal")).toBeInTheDocument();
    expect(screen.queryByText("calendar.delegated")).not.toBeInTheDocument();
    expect(screen.queryByText("calendar.other")).toBeInTheDocument();
  });

  it("renders nothing when no calendars are present", () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: {}, pending: false },
      }
    );

    expect(screen.queryByLabelText(/Calendar/)).not.toBeInTheDocument();
  });

  it("expands and collapses accordions when clicked", () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false },
      }
    );
    const delegatedAccordionSummary = screen
      .getByText("calendar.delegated")
      .closest(".MuiAccordionSummary-root");

    fireEvent.click(delegatedAccordionSummary!);
    expect(delegatedAccordionSummary).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(delegatedAccordionSummary!);
    expect(delegatedAccordionSummary).toHaveAttribute("aria-expanded", "false");
  });
});
