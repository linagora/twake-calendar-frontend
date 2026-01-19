import { screen, fireEvent, waitFor } from "@testing-library/react";
import CalendarPopover from "@/components/Calendar/CalendarModal";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import * as eventThunks from "@/features/Calendars/services";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { getSecretLink } from "@/features/Calendars/CalendarApi";

jest.mock("@/features/Calendars/CalendarApi", () => ({
  getSecretLink: jest.fn(),
}));

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
      <CalendarPopover open={open} onClose={mockOnClose} />,
      preloadedState
    );
  };

  it("renders popover and inputs", () => {
    renderPopover();

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByText("event.form.addDescription")).toBeInTheDocument();
  });

  it("updates name and description fields", () => {
    renderPopover();

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "My Calendar" } });
    expect(nameInput).toHaveValue("My Calendar");

    fireEvent.click(screen.getByText("event.form.addDescription"));
    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: "Test description" } });
    expect(descInput).toHaveValue("Test description");
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
    fireEvent.click(screen.getByText("event.form.addDescription"));
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Test Description" },
    });

    const colorButtons = screen.getAllByRole("button", {
      name: /select color/i,
    });
    fireEvent.click(colorButtons[0]);

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(spy).toHaveBeenCalled();

    expect(mockOnClose).toHaveBeenCalledWith({}, "backdropClick");
  });

  it("calls onClose when Cancel clicked", () => {
    renderPopover();

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

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

  const existingCalendar: Calendar = {
    id: "user1/cal1",
    link: "/calendars/user/cal1",
    name: "Work Calendar",
    description: "Team meetings",
    color: { light: "#33B679" },
    owner: "alice",
    ownerEmails: ["alice@example.com"],
    visibility: "public",
    events: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prefills fields when calendar prop is given", () => {
    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    );

    expect(screen.getByLabelText(/Name/i)).toHaveValue("Work Calendar");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("Team meetings");
  });

  test("Save button is disabled when name is empty or whitespace only", () => {
    renderWithProviders(<CalendarPopover open={true} onClose={jest.fn()} />, {
      user: baseUser,
    });

    const saveButton = screen.getByRole("button", { name: /create/i });
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
    fireEvent.click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          calId: "user1/cal1",
          calLink: "/calendars/user/cal1",
          patch: {
            color: { light: "#33B679" },
            desc: "Team meetings",
            name: "Updated Calendar",
          },
        })
      )
    );
    expect(mockOnClose).toHaveBeenCalled();
  });
});

describe("CalendarPopover - Tabs Scenarios", () => {
  const mockOnClose = jest.fn();
  const baseUser = {
    userData: {
      openpaasId: "user1",
    },
  };

  const writeText = jest.fn();

  Object.assign(navigator, {
    clipboard: {
      writeText,
    },
  });

  const existingCalendar: Calendar = {
    id: "user1/cal1",
    link: "/calendars/user1/cal1.json",
    name: "Work Calendar",
    description: "Team meetings",
    color: { light: "#33B679" },
    owner: "alice",
    ownerEmails: ["alice@example.com"],
    visibility: "public",
    events: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resets state after closing and reopening", () => {
    const { rerender } = renderWithProviders(
      <CalendarPopover open={true} onClose={mockOnClose} />,
      { user: baseUser }
    );

    // Enter some data
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "Temp Calendar" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();

    // Reopen: state should be reset
    rerender(<CalendarPopover open={true} onClose={mockOnClose} />);
    expect(screen.getByLabelText(/Name/i)).toHaveValue("");
  });

  it("shows Access tab only when editing an existing calendar", () => {
    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    );

    expect(screen.getByRole("tab", { name: /Access/i })).toBeInTheDocument();
  });

  it("does not show Access tab when creating new calendar", () => {
    renderWithProviders(<CalendarPopover open={true} onClose={mockOnClose} />, {
      user: baseUser,
    });

    expect(
      screen.queryByRole("tab", { name: /Access/i })
    ).not.toBeInTheDocument();
  });

  it("patches ACL when visibility changes", async () => {
    const patchSpy = jest
      .spyOn(eventThunks, "patchACLCalendarAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    );

    // By default: "All" (public) is selected
    const publicButton = screen.getByRole("button", { name: /All/i });
    const privateButton = screen.getByRole("button", { name: /You/i });

    expect(publicButton).toHaveAttribute("aria-pressed", "true");
    expect(privateButton).toHaveAttribute("aria-pressed", "false");

    // Change to private
    fireEvent.click(privateButton);

    expect(privateButton).toHaveAttribute("aria-pressed", "true");
    expect(publicButton).toHaveAttribute("aria-pressed", "false");

    // Save
    fireEvent.click(screen.getByRole("button", { name: "actions.save" }));

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          calId: "user1/cal1",
          request: "",
        })
      )
    );
  });

  it("copies CalDAV link from Access tab", async () => {
    (window as any).CALENDAR_BASE_URL = "https://cal.example.org";
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn() },
    });
    (getSecretLink as jest.Mock).mockResolvedValue({
      secretLink: "https://example.org/secret/initial",
    });

    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    );

    // Switch to Access tab
    fireEvent.click(screen.getByRole("tab", { name: /Access/i }));

    // Expect text field with caldav link
    const input = screen.getByLabelText("calendar.caldav_access");
    expect(input).toHaveValue("https://cal.example.org/calendars/user1/cal1");

    // Click copy button (find button containing ContentCopyIcon)
    const copyIcon = screen.getAllByTestId("ContentCopyIcon")[0];
    const copyButton = copyIcon.closest("button");
    if (copyButton) {
      fireEvent.click(copyButton);
    }

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://cal.example.org/calendars/user1/cal1"
    );

    // Snackbar should appear
    await waitFor(() =>
      expect(screen.getByText("common.link_copied")).toBeInTheDocument()
    );
  });

  describe("Import flow", () => {
    const file = new File(["test"], "events.ics", { type: "text/calendar" });

    it("creates a new calendar and imports events when Import with 'new' target", async () => {
      const createSpy = jest
        .spyOn(eventThunks, "createCalendarAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });
      const importSpy = jest
        .spyOn(eventThunks, "importEventFromFileAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      renderWithProviders(
        <CalendarPopover open={true} onClose={mockOnClose} />,
        {
          user: baseUser,
        }
      );

      // Switch to Import tab
      fireEvent.click(screen.getByRole("tab", { name: /Import/i }));

      // Provide new calendar params
      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: "Imported Calendar" },
      });
      const fileInput = screen.getByLabelText("common.select_file");
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Click Import
      fireEvent.click(screen.getByRole("button", { name: "actions.import" }));

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      await waitFor(() => expect(importSpy).toHaveBeenCalled());
    });

    it("imports into an existing calendar when target is set", async () => {
      const importSpy = jest
        .spyOn(eventThunks, "importEventFromFileAsync")
        .mockImplementation((payload) => {
          return () => Promise.resolve(payload) as any;
        });

      const calendars = {
        "user1/cal1": existingCalendar,
      };

      renderWithProviders(
        <CalendarPopover
          open={true}
          onClose={mockOnClose}
          calendar={existingCalendar}
        />,
        { user: baseUser, calendars: { list: calendars } }
      );

      fireEvent.click(screen.getByRole("tab", { name: /Import/i }));
      const fileInput = screen.getByLabelText("common.select_file");
      fireEvent.change(fileInput, { target: { files: [file] } });

      fireEvent.click(screen.getByRole("button", { name: "actions.import" }));

      await waitFor(() =>
        expect(importSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            calLink: "/calendars/user1/cal1.json",
            file,
          })
        )
      );
    });

    it("disables Import button until a file is uploaded", () => {
      renderWithProviders(
        <CalendarPopover open={true} onClose={mockOnClose} />,
        {
          user: baseUser,
        }
      );

      fireEvent.click(screen.getByRole("tab", { name: /Import/i }));

      const importButton = screen.getByRole("button", {
        name: "actions.import",
      });
      expect(importButton).toBeDisabled();
    });
  });

  it("fetches and resets the secret link", async () => {
    (window as any).CALENDAR_BASE_URL = "https://cal.example.org";

    (getSecretLink as jest.Mock)
      .mockResolvedValueOnce({
        secretLink: "https://example.org/secret/initial",
      })
      .mockResolvedValueOnce({
        secretLink: "https://example.org/secret/new",
      });

    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    );

    fireEvent.click(screen.getByRole("tab", { name: /Access/i }));

    await waitFor(() =>
      expect(
        screen.getByDisplayValue("https://example.org/secret/initial")
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    await waitFor(() =>
      expect(
        screen.getByDisplayValue("https://example.org/secret/new")
      ).toBeInTheDocument()
    );

    expect(getSecretLink).toHaveBeenCalledWith(
      existingCalendar.link.replace(".json", ""),
      true
    );
  });
});
