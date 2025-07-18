import { screen, fireEvent } from "@testing-library/react";
import { useAppDispatch } from "../../../src/app/hooks";
import { createCalendar } from "../../../src/features/Calendars/CalendarSlice";
import CalendarPopover from "../../../src/features/Calendars/CalendarModal";
import { renderWithProviders } from "../../utils/Renderwithproviders";

jest.mock("../../../src/app/hooks");

describe("CalendarPopover", () => {
  const mockDispatch = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);
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
    expect(screen.getByText("Create a Calendar")).toBeInTheDocument();
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
    expect(screen.getByText("Create a Calendar").style.backgroundColor).toBe(
      colorButtons[0].style.backgroundColor
    );
  });

  it("dispatches createCalendar and calls onClose when Save clicked", () => {
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

    expect(mockDispatch).toHaveBeenCalledWith(
      createCalendar({
        name: "Test Calendar",
        description: "Test Description",
        color: expectedColor,
      })
    );

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
