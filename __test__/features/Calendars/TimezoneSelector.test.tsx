import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { TimezoneSelector } from "../../../src/components/Calendar/TimezoneSelector";
import { renderWithProviders } from "../../utils/Renderwithproviders";

describe("TimezoneSelector", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with initial timezone value", () => {
    renderWithProviders(
      <TimezoneSelector
        referenceDate={new Date()}
        value="America/New_York"
        onChange={mockOnChange}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/UTC[-−][45]/i); // New York offset
  });

  it("opens popover when button is clicked", async () => {
    renderWithProviders(
      <TimezoneSelector
        referenceDate={new Date()}
        value="Europe/Paris"
        onChange={mockOnChange}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  it("calls onChange when a new timezone is selected", async () => {
    renderWithProviders(
      <TimezoneSelector
        referenceDate={new Date()}
        value="Europe/Paris"
        onChange={mockOnChange}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const autocomplete = screen.getByRole("combobox");
    fireEvent.change(autocomplete, { target: { value: "Los Angeles" } });

    // Find and click the Los Angeles option
    const option = await screen.findByText(/Los Angeles/i);
    fireEvent.click(option);

    expect(mockOnChange).toHaveBeenCalledWith("America/Los_Angeles");
  });

  it("closes popover after timezone selection", async () => {
    renderWithProviders(
      <TimezoneSelector
        referenceDate={new Date()}
        value="Europe/Paris"
        onChange={mockOnChange}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const autocomplete = screen.getByRole("combobox");
    fireEvent.change(autocomplete, { target: { value: "Tokyo" } });

    const option = await screen.findByText(/Tokyo/i);
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  it("displays timezones with half-hour offsets correctly", () => {
    renderWithProviders(
      <TimezoneSelector
        referenceDate={new Date()}
        value="Asia/Kolkata"
        onChange={mockOnChange}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("UTC+5:30"); // India offset
  });

  it("shows correct offset for Europe/Paris depending on daylight saving time", () => {
    // Summer date (DST on)
    const summerDate = new Date("2025-07-15T12:00:00Z");
    renderWithProviders(
      <TimezoneSelector
        value="Europe/Paris"
        onChange={mockOnChange}
        referenceDate={summerDate}
      />
    );
    let button = screen.getByRole("button");
    expect(button).toHaveTextContent(/UTC\+2\b/);
    cleanup();
    // Rerender with a winter date (DST off)
    const winterDate = new Date("2025-01-15T12:00:00Z");
    renderWithProviders(
      <TimezoneSelector
        value="Europe/Paris"
        onChange={mockOnChange}
        referenceDate={winterDate}
      />
    );
    button = screen.getByRole("button");
    expect(button).toHaveTextContent(/UTC\+1\b/);
  });
});
