import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Menubar } from "../../src/components/Menubar/Menubar";
import { renderWithProviders } from "../utils/Renderwithproviders";
import * as oidcAuth from "../../src/features/User/oidcAuth";

describe("Calendar App Component Display Tests", () => {
  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        family_name: "Doe",
        name: "John",
        sid: "mockSid",
        openpaasId: "667037022b752d0026472254",
      },
    },
  };
  test("renders the Menubar component", () => {
    (window as any).appList = [
      { name: "Twake", link: "/twake", icon: "twake.svg" },
      { name: "Calendar", link: "/calendar", icon: "calendar.svg" },
    ];
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    const logoElement = screen.getByAltText("menubar.logoAlt");
    expect(logoElement).toBeInTheDocument();
  });
  it("renders the main title", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    expect(screen.getByAltText("menubar.logoAlt")).toBeInTheDocument();
  });

  it("shows avatar with user initials", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows avatar with email initials when no user name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: "Doe",
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  // Edge cases for avatar display logic
  it("handles user with only family_name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: "Smith",
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  it("handles user with only name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: null,
          name: "John",
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  it("handles user with both name and family_name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: "Doe",
          name: "John",
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("handles user with no name and family_name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: null,
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  it("handles user with empty email", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "",
          family_name: null,
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    // Should not crash and show empty string
    const avatar = screen.getByRole("img", { hidden: true });
    expect(avatar).toBeInTheDocument();
  });

  it("handles user with null email", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: null,
          family_name: null,
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    // Should not crash and show empty string
    const avatar = screen.getByRole("img", { hidden: true });
    expect(avatar).toBeInTheDocument();
  });

  it("handles user with undefined email", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: undefined,
          family_name: null,
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    // Should not crash and show empty string
    const avatar = screen.getByRole("img", { hidden: true });
    expect(avatar).toBeInTheDocument();
  });

  it("shows AppsIcon when applist is not empty", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    expect(screen.getByTestId("AppsIcon")).toBeInTheDocument();
  });

  it("opens popover when clicking AppsIcon", () => {
    (window as any).appList = [
      { name: "Twake", icon: "twake.svg", link: "/twake" },
      { name: "Calendar", icon: "calendar.svg", link: "/calendar" },
    ];
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    const appsButton = screen.getByTestId("AppsIcon");
    fireEvent.click(appsButton);
    expect(screen.getByText("Twake")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });

  it("renders app icons as links", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
    const appsButton = screen.getByTestId("AppsIcon");
    fireEvent.click(appsButton);

    const testLink = screen.getByRole("link", { name: /test/i });
    expect(testLink).toHaveAttribute("href", "test");
  });
});

describe("Menubar interaction with expanded Dialog", () => {
  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        family_name: "Doe",
        name: "John",
        sid: "mockSid",
        openpaasId: "667037022b752d0026472254",
      },
    },
    settings: {
      language: "en",
    },
  };

  beforeEach(() => {
    (window as any).appList = [
      { name: "Twake", link: "/twake", icon: "twake.svg" },
      { name: "Calendar", link: "/calendar", icon: "calendar.svg" },
    ];
  });

  afterEach(() => {
    document.body.classList.remove("fullscreen-view");
  });

  it("has navigation controls element with correct class", () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const navigationControls = container.querySelector(".navigation-controls");
    expect(navigationControls).toBeInTheDocument();
    expect(navigationControls).toHaveClass("navigation-controls");
  });

  it("has current date time element with correct class", () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const dateTimeDisplay = container.querySelector(".current-date-time");
    expect(dateTimeDisplay).toBeInTheDocument();
    expect(dateTimeDisplay).toHaveClass("current-date-time");
  });

  it("has refresh button element with correct class", () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const refreshButton = container.querySelector(".refresh-button");
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).toHaveClass("refresh-button");
  });

  it("has view selector element with correct class", () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const selectDisplay = container.querySelector(".select-display");
    expect(selectDisplay).toBeInTheDocument();
    expect(selectDisplay).toHaveClass("select-display");
  });

  it("keeps logo visible when dialog is expanded", () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    document.body.classList.add("fullscreen-view");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const logoElement = screen.getByAltText("menubar.logoAlt");
    expect(logoElement).toBeInTheDocument();
    expect(logoElement).toBeVisible();
  });

  it("keeps apps icon clickable when dialog is expanded", () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    document.body.classList.add("fullscreen-view");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const appsButton = screen.getByTestId("AppsIcon");
    expect(appsButton).toBeVisible();

    fireEvent.click(appsButton);
    expect(screen.getByText("Twake")).toBeInTheDocument();
  });

  it("opens user dropdown menu when clicking avatar", async () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const avatar = screen.getByText("JD");
    expect(avatar).toBeVisible();

    fireEvent.click(avatar.closest("button")!);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("test@test.com")).toBeInTheDocument();
    });
  });

  it("closes user dropdown menu when clicking outside", async () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const avatar = screen.getByText("JD");
    fireEvent.click(avatar.closest("button")!);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Click outside the menu - MUI Menu closes on backdrop click
    const backdrop = document.querySelector(".MuiBackdrop-root");
    if (backdrop) {
      fireEvent.click(backdrop);
    } else {
      // Fallback: click on body
      fireEvent.mouseDown(document.body);
    }

    await waitFor(
      () => {
        expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("displays user name and email in dropdown menu", async () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const avatar = screen.getByText("JD");
    fireEvent.click(avatar.closest("button")!);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("test@test.com")).toBeInTheDocument();
    });
  });

  it("navigates to settings page when clicking Settings in dropdown", async () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const preloadedStateWithSettings = {
      ...preloadedState,
      settings: {
        language: "en",
        view: "calendar",
      },
    };

    const { store } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedStateWithSettings
    );

    const avatar = screen.getByText("JD");
    fireEvent.click(avatar.closest("button")!);

    await waitFor(() => {
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });

    const settingsButton = screen.getByText(/Settings/i);
    fireEvent.click(settingsButton);

    await waitFor(() => {
      const state = store.getState();
      expect(state.settings.view).toBe("settings");
    });
  });

  it("shows all elements in normal mode (not expanded)", () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const navigationControls = container.querySelector(".navigation-controls");
    const dateTimeDisplay = container.querySelector(".current-date-time");
    const refreshButton = container.querySelector(".refresh-button");
    const selectDisplay = container.querySelector(".select-display");

    expect(navigationControls).toBeVisible();
    expect(dateTimeDisplay).toBeVisible();
    expect(refreshButton).toBeVisible();
    expect(selectDisplay).toBeVisible();
  });

  it("verifies CSS classes are correctly applied to elements", () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { container } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    expect(container.querySelector(".menubar")).toBeInTheDocument();
    expect(container.querySelector(".navigation-controls")).toBeInTheDocument();
    expect(container.querySelector(".current-date-time")).toBeInTheDocument();
    expect(container.querySelector(".refresh-button")).toBeInTheDocument();
    expect(container.querySelector(".select-display")).toBeInTheDocument();
  });
});

describe("Menubar logout flow", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  function renderMenubar(user = { name: "John", email: "test@example.com" }) {
    const preloadedState = {
      user: { userData: user },
      settings: { view: "calendar" },
    };

    return renderWithProviders(
      <Menubar
        calendarRef={{ current: null }}
        onRefresh={() => {}}
        currentDate={new Date()}
        currentView="dayGridMonth"
      />,
      preloadedState
    );
  }

  it("clears storage before redirecting", async () => {
    sessionStorage.setItem("tokenSet", "dummy");
    const logoutSpy = jest
      .spyOn(oidcAuth, "Logout")
      .mockResolvedValue(new URL("https://logout.url"));

    await act(async () => {
      renderMenubar();
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("menubar.userProfile"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("menubar.logout"));
    });
    expect(logoutSpy).toHaveBeenCalled();

    expect(sessionStorage.length).toBe(0);
  });
});

describe("Logo click navigation to current week", () => {
  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        family_name: "Doe",
        name: "John",
        sid: "mockSid",
        openpaasId: "667037022b752d0026472254",
      },
    },
    settings: {
      view: "calendar",
      language: "en",
    },
  };

  beforeEach(() => {
    (window as any).appList = [];
  });

  it("navigates to week view and current week when clicking logo from month view", async () => {
    const mockChangeView = jest.fn();
    const mockToday = jest.fn();
    const mockGetDate = jest.fn(() => new Date());
    const mockCalendarApi = {
      changeView: mockChangeView,
      today: mockToday,
      getDate: mockGetDate,
    };
    const mockCalendarRef = { current: mockCalendarApi as any };
    const mockOnRefresh = jest.fn();
    const mockOnViewChange = jest.fn();
    const mockOnDateChange = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { store } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
        onViewChange={mockOnViewChange}
        onDateChange={mockOnDateChange}
      />,
      preloadedState
    );

    const logoElement = screen.getByAltText("menubar.logoAlt");
    await act(async () => {
      fireEvent.click(logoElement);
    });

    await waitFor(() => {
      expect(store.getState().settings.view).toBe("calendar");
    });

    expect(mockChangeView).toHaveBeenCalledWith("timeGridWeek");
    expect(mockToday).toHaveBeenCalled();
    expect(mockOnViewChange).toHaveBeenCalledWith("timeGridWeek");
    expect(mockOnDateChange).toHaveBeenCalled();
  });

  it("navigates to week view and current week when clicking logo from day view", async () => {
    const mockChangeView = jest.fn();
    const mockToday = jest.fn();
    const mockGetDate = jest.fn(() => new Date());
    const mockCalendarApi = {
      changeView: mockChangeView,
      today: mockToday,
      getDate: mockGetDate,
    };
    const mockCalendarRef = { current: mockCalendarApi as any };
    const mockOnRefresh = jest.fn();
    const mockOnViewChange = jest.fn();
    const mockOnDateChange = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { store } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="timeGridDay"
        onViewChange={mockOnViewChange}
        onDateChange={mockOnDateChange}
      />,
      preloadedState
    );

    const logoElement = screen.getByAltText("menubar.logoAlt");
    await act(async () => {
      fireEvent.click(logoElement);
    });

    await waitFor(() => {
      expect(store.getState().settings.view).toBe("calendar");
    });

    expect(mockChangeView).toHaveBeenCalledWith("timeGridWeek");
    expect(mockToday).toHaveBeenCalled();
    expect(mockOnViewChange).toHaveBeenCalledWith("timeGridWeek");
    expect(mockOnDateChange).toHaveBeenCalled();
  });

  it("navigates to current week when clicking logo from week view (not current week)", async () => {
    const mockChangeView = jest.fn();
    const mockToday = jest.fn();
    const mockGetDate = jest.fn(() => new Date());
    const mockCalendarApi = {
      changeView: mockChangeView,
      today: mockToday,
      getDate: mockGetDate,
    };
    const mockCalendarRef = { current: mockCalendarApi as any };
    const mockOnRefresh = jest.fn();
    const mockOnViewChange = jest.fn();
    const mockOnDateChange = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { store } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="timeGridWeek"
        onViewChange={mockOnViewChange}
        onDateChange={mockOnDateChange}
      />,
      preloadedState
    );

    const logoElement = screen.getByAltText("menubar.logoAlt");
    await act(async () => {
      fireEvent.click(logoElement);
    });

    await waitFor(() => {
      expect(store.getState().settings.view).toBe("calendar");
    });

    expect(mockChangeView).not.toHaveBeenCalled();
    expect(mockToday).toHaveBeenCalled();
    expect(mockOnDateChange).toHaveBeenCalled();
  });

  it("does not crash when calendarRef.current is null", async () => {
    const mockCalendarRef = { current: null };
    const mockOnRefresh = jest.fn();
    const mockOnViewChange = jest.fn();
    const mockOnDateChange = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { store } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
        onViewChange={mockOnViewChange}
        onDateChange={mockOnDateChange}
      />,
      preloadedState
    );

    const logoElement = screen.getByAltText("menubar.logoAlt");
    await act(async () => {
      fireEvent.click(logoElement);
    });

    await waitFor(() => {
      expect(store.getState().settings.view).toBe("calendar");
    });

    expect(mockOnViewChange).not.toHaveBeenCalled();
    expect(mockOnDateChange).not.toHaveBeenCalled();
  });

  it("handles missing onViewChange and onDateChange callbacks", async () => {
    const mockChangeView = jest.fn();
    const mockToday = jest.fn();
    const mockGetDate = jest.fn(() => new Date());
    const mockCalendarApi = {
      changeView: mockChangeView,
      today: mockToday,
      getDate: mockGetDate,
    };
    const mockCalendarRef = { current: mockCalendarApi as any };
    const mockOnRefresh = jest.fn();
    const mockCurrentDate = new Date("2024-04-15");

    const { store } = renderWithProviders(
      <Menubar
        calendarRef={mockCalendarRef}
        onRefresh={mockOnRefresh}
        currentDate={mockCurrentDate}
        currentView="dayGridMonth"
      />,
      preloadedState
    );

    const logoElement = screen.getByAltText("menubar.logoAlt");
    await act(async () => {
      fireEvent.click(logoElement);
    });

    await waitFor(() => {
      expect(store.getState().settings.view).toBe("calendar");
    });

    expect(mockChangeView).toHaveBeenCalledWith("timeGridWeek");
    expect(mockToday).toHaveBeenCalled();
  });
});
