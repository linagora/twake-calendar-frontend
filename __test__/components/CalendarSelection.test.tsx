import { screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CalendarSelection from "../../src/components/Calendar/CalendarSelection";
import { renderWithProviders } from "../utils/Renderwithproviders";

describe("CalendarSelection", () => {
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
      ownerEmails: ["alice@example.com"],
    },
    "user2/cal1": {
      name: "Calendar delegated",
      delegated: true,
      id: "user2/cal1",
      color: "#00FF00",
      ownerEmails: ["bob@example.com"],
    },
    "user3/cal1": {
      name: "Calendar shared",
      id: "user3/cal1",
      color: "#0000FF",
      ownerEmails: ["charlie@example.com"],
    },
  };

  it("renders personal, delegated and other calendars", () => {
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

    expect(screen.getByText("Personnal Calendars")).toBeInTheDocument();
    expect(screen.getByText("Delegated Calendars")).toBeInTheDocument();
    expect(screen.getByText("Other Calendars")).toBeInTheDocument();

    expect(screen.getByLabelText("Calendar personal")).toBeChecked();
    expect(screen.getByLabelText("Calendar delegated")).not.toBeChecked();
    expect(screen.getByLabelText("Calendar shared")).not.toBeChecked();
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

  it("opens CalendarPopover modal when personal Add button is clicked", () => {
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
    fireEvent.click(addButtons[0]);

    expect(screen.getByRole("presentation")).toBeInTheDocument();
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

    const addButtons = screen.getAllByRole("button");
    fireEvent.click(addButtons[1]); // seccond Add button (other)

    expect(screen.getByRole("presentation")).toBeInTheDocument();
  });

  it("renders only personal calendars if no delegated/other exist", () => {
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

    expect(screen.getByText("Personnal Calendars")).toBeInTheDocument();
    expect(screen.queryByText("Delegated Calendars")).not.toBeInTheDocument();
    expect(screen.queryByText("Other Calendars")).not.toBeInTheDocument();
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

  it("applies background color styles to checkboxes", () => {
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

    const personalCheckbox = screen.getByLabelText("Calendar personal");
    expect(personalCheckbox).toHaveStyle({ backgroundColor: "#FF0000" });
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
      .getByText("Delegated Calendars")
      .closest(".MuiAccordionSummary-root");

    fireEvent.click(delegatedAccordionSummary!);
    expect(delegatedAccordionSummary).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(delegatedAccordionSummary!);
    expect(delegatedAccordionSummary).toHaveAttribute("aria-expanded", "true");
  });
});
