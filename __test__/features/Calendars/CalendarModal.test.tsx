import { screen, fireEvent, waitFor } from "@testing-library/react";
import CalendarPopover from "../../../src/features/Calendars/CalendarModal";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import * as eventThunks from "../../../src/features/Calendars/CalendarSlice";

describe("CalendarPopover", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPopover = (open = true) => {
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          sid: "aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro",
          openpaasId: "667037022b752d0026472254",
        },
      },
      calendars: { list: {}, pending: true },
    };
    renderWithProviders(
      <CalendarPopover
        anchorEl={document.body}
        open={open}
        onClose={mockOnClose}
      />,
      preloadedState
    );
  };

  it("renders popover and inputs", () => {
    renderPopover();

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText("Calendar configuration")).toBeInTheDocument();
  });

  it("updates name and description fields", () => {
    renderPopover();

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "My Calendar" } });
    expect(nameInput).toHaveValue("My Calendar");

    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: "Test description" } });
    expect(descInput).toHaveValue("Test description");
  });

  it("selects a color when a color button is clicked", () => {
    renderPopover();

    // There are multiple color buttons; pick the first
    const colorButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.style.backgroundColor !== "");
    fireEvent.click(colorButtons[0]);

    // The header background should update (check via inline style)
    expect(
      screen.getByText("Calendar configuration").style.backgroundColor
    ).toBe(colorButtons[0].style.backgroundColor);
  });

  it("dispatches createCalendar and calls onClose when Save clicked", () => {
    const spy = jest
      .spyOn(eventThunks, "createCalendarAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    renderPopover();

    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "Test Calendar" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Test Description" },
    });

    const expectedColor = "#D50000";

    const colorButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.style.backgroundColor !== "");

    fireEvent.click(colorButtons[0]);

    fireEvent.click(screen.getByText(/Save/i));

    expect(spy).toHaveBeenCalled();

    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");

    // Inputs should be reset (optional check)
    expect(screen.getByLabelText(/Name/i)).toHaveValue("");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("");
  });

  it("calls onClose when Cancel clicked", () => {
    renderPopover();

    fireEvent.click(screen.getByText(/Cancel/i));

    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });
});

describe("CalendarPopover (editing mode)", () => {
  const mockOnClose = jest.fn();

  const baseUser = {
    userData: {
      sub: "test",
      email: "test@test.com",
      sid: "mockSid",
      openpaasId: "user1",
    },
  };

  const existingCalendar = {
    id: "user1/cal1",
    link: "/calendars/user/cal1",
    name: "Work Calendar",
    description: "Team meetings",
    color: "#33B679",
    owner: "alice",
    ownerEmails: ["alice@example.com"],
    events: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prefills fields when calendar prop is given", () => {
    renderWithProviders(
      <CalendarPopover
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    );

    expect(screen.getByLabelText(/Name/i)).toHaveValue("Work Calendar");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("Team meetings");
    expect(screen.getByText("Calendar configuration")).toHaveStyle({
      backgroundColor: "#33B679",
    });
  });

  test("Save button is disabled when name is empty or whitespace only", () => {
    renderWithProviders(
      <CalendarPopover
        anchorEl={document.createElement("div")}
        open={true}
        onClose={jest.fn()}
      />,
      { user: baseUser }
    );

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
    // only spaces
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: "    " } });

    expect(saveButton).toBeDisabled();

    // valid name
    fireEvent.change(nameInput, { target: { value: "Work Calendar" } });
    expect(saveButton).toBeEnabled();
  });

  it("allows modifying and saving existing calendar", async () => {
    const spy = jest
      .spyOn(eventThunks, "patchCalendarAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    renderWithProviders(
      <CalendarPopover
        anchorEl={document.body}
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    );

    // Change name
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "Updated Calendar" },
    });

    // Save
    fireEvent.click(screen.getByText(/Save/i));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          calId: "user1/cal1",
          calLink: "/calendars/user/cal1",
          patch: {
            color: "#33B679",
            desc: "Team meetings",
            name: "Updated Calendar",
          },
        })
      )
    );
    expect(mockOnClose).toHaveBeenCalled();
  });
});
