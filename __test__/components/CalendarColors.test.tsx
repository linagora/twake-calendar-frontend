import CalendarSearch from "@/components/Calendar/CalendarSearch";
import * as CalendarApi from "@/features/Calendars/CalendarApi";
import * as CalendarSlice from "@/features/Calendars/services";
import { searchUsers } from "@/features/User/userAPI";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils/Renderwithproviders";

jest.mock("@/features/User/userAPI");
jest.mock("@/features/Calendars/CalendarApi");

const mockedSearchUsers = searchUsers as jest.MockedFunction<
  typeof searchUsers
>;
const mockedGetCalendars = CalendarApi.getCalendars as jest.MockedFunction<
  typeof CalendarApi.getCalendars
>;

describe("CalendarSearch", () => {
  const mockOnClose = jest.fn();
  const mockUser = {
    email: "user@example.com",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
    openpaasId: "user123",
  };

  const mockCalendar = {
    "dav:name": "Test Calendar",
    "apple:color": "#FF0000",
    _links: {
      self: {
        href: "/calendars/user123/cal1.json",
      },
    },
  };

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
          name: "My Calendar",
          id: "user1/cal1",
          color: "#0000FF",
          owner: { emails: ["test@test.com"] },
          events: {},
        },
      },
      pending: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("searches for users and displays their calendars", async () => {
    mockedSearchUsers.mockResolvedValueOnce([mockUser]);
    mockedGetCalendars.mockResolvedValueOnce({
      _embedded: {
        "dav:calendar": [mockCalendar],
      },
    });

    await act(async () => {
      renderWithProviders(
        <CalendarSearch anchorEl={null} open={true} onClose={mockOnClose} />,
        preloadedState
      );
    });

    const input = screen.getByRole("combobox");
    await act(async () => {
      userEvent.type(input, "Test");
    });

    const option = await screen.findByText("Test User");
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(mockedGetCalendars).toHaveBeenCalledWith(
        "user123",
        "sharedPublic=true&"
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Test Calendar/i)).toBeInTheDocument();
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });
  });

  it("adds selected calendars on save", async () => {
    const addSharedCalendarSpy = jest
      .spyOn(CalendarSlice, "addSharedCalendarAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    mockedSearchUsers.mockResolvedValueOnce([mockUser]);
    mockedGetCalendars.mockResolvedValueOnce({
      _embedded: {
        "dav:calendar": [mockCalendar],
      },
    });

    await act(async () => {
      renderWithProviders(
        <CalendarSearch anchorEl={null} open={true} onClose={mockOnClose} />,
        preloadedState
      );
    });

    const input = screen.getByRole("combobox");
    await act(async () => {
      userEvent.type(input, "Test");
    });

    const option = await screen.findByText("Test User");
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(screen.getByText(/Test Calendar/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /add/i });
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(addSharedCalendarSpy).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not add calendars that already exist", async () => {
    const addSharedCalendarSpy = jest
      .spyOn(CalendarSlice, "addSharedCalendarAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    const existingCalendar = {
      ...mockCalendar,
      _links: {
        self: {
          href: "/calendars/user1/cal1.json",
        },
      },
    };

    mockedSearchUsers.mockResolvedValueOnce([mockUser]);
    mockedGetCalendars.mockResolvedValueOnce({
      _embedded: {
        "dav:calendar": [existingCalendar],
      },
    });

    await act(async () => {
      renderWithProviders(
        <CalendarSearch anchorEl={null} open={true} onClose={mockOnClose} />,
        preloadedState
      );
    });

    const input = screen.getByRole("combobox");
    await act(async () => {
      userEvent.type(input, "Test");
    });

    const option = await screen.findByText("Test User");
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(
        screen.getByText("calendar.noMoreCalendarsFor(name=Test User)")
      ).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /add/i });
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(addSharedCalendarSpy).not.toHaveBeenCalled();
  });

  it("displays message when user has no publicly available calendars", async () => {
    mockedSearchUsers.mockResolvedValueOnce([mockUser]);
    mockedGetCalendars.mockResolvedValueOnce({});

    await act(async () => {
      renderWithProviders(
        <CalendarSearch anchorEl={null} open={true} onClose={mockOnClose} />,
        preloadedState
      );
    });

    const input = screen.getByRole("combobox");
    await act(async () => {
      userEvent.type(input, "Test");
    });

    const option = await screen.findByText("Test User");
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(
        screen.getByText("calendar.noPublicCalendarsFor(name=Test User)")
      ).toBeInTheDocument();
    });
  });

  it("changes calendar color", async () => {
    mockedSearchUsers.mockResolvedValueOnce([mockUser]);
    mockedGetCalendars.mockResolvedValueOnce({
      _embedded: {
        "dav:calendar": [mockCalendar],
      },
    });

    await act(async () => {
      renderWithProviders(
        <CalendarSearch anchorEl={null} open={true} onClose={mockOnClose} />,
        preloadedState
      );
    });

    const input = screen.getByRole("combobox");
    await act(async () => {
      userEvent.type(input, "Test");
    });

    const option = await screen.findByText("Test User");
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(screen.getByText(/Test Calendar/i)).toBeInTheDocument();
    });

    // ColorPicker would need to be interacted with based on its implementation
    // This is a placeholder for color change interaction
    const colorPicker = document.querySelector('[data-testid="color-picker"]');
    if (colorPicker) {
      await act(async () => {
        fireEvent.click(colorPicker);
      });
    }
  });

  it("handles multiple calendars from the same user", async () => {
    const secondCalendar = {
      "dav:name": "Second Calendar",
      "apple:color": "#00FF00",
      _links: {
        self: {
          href: "/calendars/user123/cal2.json",
        },
      },
    };

    mockedSearchUsers.mockResolvedValueOnce([mockUser]);
    mockedGetCalendars.mockResolvedValueOnce({
      _embedded: {
        "dav:calendar": [mockCalendar, secondCalendar],
      },
    });

    await act(async () => {
      renderWithProviders(
        <CalendarSearch anchorEl={null} open={true} onClose={mockOnClose} />,
        preloadedState
      );
    });

    const input = screen.getByRole("combobox");
    await act(async () => {
      userEvent.type(input, "Test");
    });

    const option = await screen.findByText("Test User");
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(screen.getByText(/Test Calendar/i)).toBeInTheDocument();
      expect(screen.getByText(/Second Calendar/i)).toBeInTheDocument();
    });
  });

  it("does not call addSharedCalendarAsync when no calendars are selected", async () => {
    const addSharedCalendarSpy = jest
      .spyOn(CalendarSlice, "addSharedCalendarAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });

    await act(async () => {
      renderWithProviders(
        <CalendarSearch anchorEl={null} open={true} onClose={mockOnClose} />,
        preloadedState
      );
    });

    const addButton = screen.getByRole("button", { name: /add/i });
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(addSharedCalendarSpy).not.toHaveBeenCalled();
  });
  it("BUGFIX : handles calendar with no apple:color", async () => {
    const addSharedCalendarSpy = jest
      .spyOn(CalendarSlice, "addSharedCalendarAsync")
      .mockImplementation((payload) => {
        return () => Promise.resolve(payload) as any;
      });
    const mockCalendarNoColor = {
      "dav:name": "Test Calendar",
      _links: {
        self: {
          href: "/calendars/user123/cal2.json",
        },
      },
    };
    mockedSearchUsers.mockResolvedValueOnce([mockUser]);
    mockedGetCalendars.mockResolvedValueOnce({
      _embedded: {
        "dav:calendar": [mockCalendarNoColor],
      },
    });

    await act(async () => {
      renderWithProviders(
        <CalendarSearch anchorEl={null} open={true} onClose={mockOnClose} />,
        preloadedState
      );
    });

    const input = screen.getByRole("combobox");
    await act(async () => {
      userEvent.type(input, "Test");
    });

    await waitFor(() => {
      expect(mockedSearchUsers).toHaveBeenCalledWith("Test", expect.anything());
    });

    const option = await screen.findByText("Test User");
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(mockedGetCalendars).toHaveBeenCalledWith(
        "user123",
        "sharedPublic=true&"
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Test Calendar/i)).toBeInTheDocument();
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /add/i });
    await act(async () => {
      fireEvent.click(addButton);
    });
    await waitFor(() =>
      expect(addSharedCalendarSpy).toHaveBeenCalledWith({
        cal: {
          cal: {
            _links: { self: { href: "/calendars/user123/cal2.json" } },
            "dav:name": "Test Calendar",
          },
          color: { dark: "#329655", light: "#D0ECDA" },
          owner: {
            avatarUrl: "https://example.com/avatar.jpg",
            displayName: "Test User",
            email: "user@example.com",
            openpaasId: "user123",
          },
        },
        calId: expect.any(String),
        userId: "user1",
      })
    );

    expect(mockOnClose).toHaveBeenCalledWith(
      expect.arrayContaining(["user123/cal2"])
    );
  });
});
