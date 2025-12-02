import { fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SettingsPage from "../../../src/features/Settings/SettingsPage";
import { renderWithProviders } from "../../utils/Renderwithproviders";
import { api } from "../../../src/utils/apiUtils";

jest.mock("../../../src/utils/apiUtils");

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

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
      organiserData: null,
      tokens: null,
      language: "en",
      loading: false,
      error: null,
    },
    settings: {
      language: "en",
      view: "settings",
    },
  };

  it("renders settings page with sidebar and content layout", () => {
    renderWithProviders(<SettingsPage />, preloadedState);

    expect(screen.getByRole("main")).toHaveClass(
      "main-layout",
      "settings-layout"
    );
  });

  it("displays sidebar navigation with Settings and Notifications items", () => {
    const { container } = renderWithProviders(<SettingsPage />, preloadedState);

    // Check sidebar navigation items
    const sidebar = container.querySelector(".settings-sidebar");
    expect(sidebar).toBeInTheDocument();
    expect(screen.getAllByText(/settings.title/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/settings.notifications/i)).toBeInTheDocument();
  });

  it("highlights active navigation item", () => {
    const { container } = renderWithProviders(<SettingsPage />, preloadedState);

    const settingsNavItem = container.querySelector(
      ".settings-nav-item.active"
    );
    expect(settingsNavItem).toBeInTheDocument();
  });

  it("navigates back to calendar view when clicking back button", async () => {
    const { store } = renderWithProviders(<SettingsPage />, preloadedState);

    const backButton = screen.getByLabelText("settings.back");
    fireEvent.click(backButton);

    await waitFor(() => {
      const state = store.getState();
      expect(state.settings.view).toBe("calendar");
    });
  });

  it("switches between Settings and Notifications tabs", () => {
    renderWithProviders(<SettingsPage />, preloadedState);

    const notificationsTab = screen.getByRole("tab", {
      name: /settings.notifications/i,
    });
    fireEvent.click(notificationsTab);

    expect(
      screen.getByText(/settings.notifications.empty/i)
    ).toBeInTheDocument();
  });

  it("displays language select in Settings tab", () => {
    renderWithProviders(<SettingsPage />, preloadedState);

    expect(
      screen.getByLabelText("settings.languageSelector")
    ).toBeInTheDocument();
  });

  it("displays all available language options and uses language from user state", async () => {
    const stateWithUserLanguage = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: "Doe",
          name: "John",
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
        organiserData: null,
        tokens: null,
        language: "fr",
        loading: false,
        error: null,
      },
      settings: {
        language: "en",
        view: "settings",
      },
    };
    renderWithProviders(<SettingsPage />, stateWithUserLanguage);

    const languageSelect = screen.getByLabelText("settings.languageSelector");

    // Verify Select exists
    expect(languageSelect).toBeInTheDocument();

    // Verify that the underlying native input reflects the user language ("fr")
    const nativeInput = languageSelect.querySelector(
      'input[aria-hidden="true"]'
    ) as HTMLInputElement | null;
    expect(nativeInput).not.toBeNull();
    expect(nativeInput?.value).toBe("fr");
  });

  it("updates language immediately (optimistic update) and calls API in background", async () => {
    (api.patch as jest.Mock).mockResolvedValue({ status: 204 });

    const { store } = renderWithProviders(<SettingsPage />, preloadedState);

    const languageSelect = screen.getByLabelText("settings.languageSelector");

    // MUI Select uses a native input element - find and change it
    const nativeInput = languageSelect.querySelector(
      'input[aria-hidden="true"]'
    ) as HTMLInputElement;
    expect(nativeInput).toBeInTheDocument();

    // Simulate change event on the native input
    Object.defineProperty(nativeInput, "value", {
      writable: true,
      value: "fr",
    });
    fireEvent.change(nativeInput, { target: { value: "fr" } });

    // Language should be updated immediately (optimistic update)
    await waitFor(() => {
      const state = store.getState();
      expect(state.user?.language).toBe("fr");
      expect(state.settings.language).toBe("fr");
    });

    // API should be called in background
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "api/configurations?scope=user",
        expect.objectContaining({
          json: expect.arrayContaining([
            expect.objectContaining({
              name: "core",
              configurations: expect.arrayContaining([
                expect.objectContaining({ name: "language", value: "fr" }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  it("saves language change to localStorage immediately (optimistic update)", async () => {
    (api.patch as jest.Mock).mockResolvedValue({ status: 204 });

    renderWithProviders(<SettingsPage />, preloadedState);

    const languageSelect = screen.getByLabelText("settings.languageSelector");

    // MUI Select uses a native input element - find and change it
    const nativeInput = languageSelect.querySelector(
      'input[aria-hidden="true"]'
    ) as HTMLInputElement;
    expect(nativeInput).toBeInTheDocument();

    // Simulate change event on the native input
    Object.defineProperty(nativeInput, "value", {
      writable: true,
      value: "fr",
    });
    fireEvent.change(nativeInput, { target: { value: "fr" } });

    // localStorage should be updated immediately (optimistic update)
    await waitFor(() => {
      expect(localStorage.getItem("lang")).toBe("fr");
    });
  });

  it("rolls back language change if API call fails", async () => {
    (api.patch as jest.Mock).mockRejectedValue(new Error("API Error"));

    const { store } = renderWithProviders(<SettingsPage />, preloadedState);

    const languageSelect = screen.getByLabelText("settings.languageSelector");

    // MUI Select uses a native input element - find and change it
    const nativeInput = languageSelect.querySelector(
      'input[aria-hidden="true"]'
    ) as HTMLInputElement;
    expect(nativeInput).toBeInTheDocument();

    // Simulate change event on the native input
    Object.defineProperty(nativeInput, "value", {
      writable: true,
      value: "fr",
    });
    fireEvent.change(nativeInput, { target: { value: "fr" } });

    // Wait for rollback - language should be rolled back to "en" after error
    await waitFor(
      () => {
        const state = store.getState();
        expect(state.user?.language).toBe("en");
        expect(state.settings.language).toBe("en");
      },
      { timeout: 3000 }
    );
  });

  it("shows empty state in Notifications tab", () => {
    renderWithProviders(<SettingsPage />, preloadedState);

    const notificationsTab = screen.getByRole("tab", {
      name: /settings.notifications/i,
    });
    fireEvent.click(notificationsTab);

    expect(
      screen.getByText("settings.notifications.empty")
    ).toBeInTheDocument();
  });

  describe("Timezone Settings", () => {
    it("displays timezone selector in Settings tab", () => {
      renderWithProviders(<SettingsPage />, preloadedState);

      expect(screen.getAllByRole("combobox")).toHaveLength(2);
    });

    it("displays timezone from user state", () => {
      const stateWithUserTimeZone = {
        user: {
          userData: {
            sub: "test",
            email: "test@test.com",
            family_name: "Doe",
            name: "John",
            sid: "mockSid",
            openpaasId: "667037022b752d0026472254",
          },
          organiserData: null,
          tokens: null,
          language: "en",
          timezone: "America/New_York",
          loading: false,
          error: null,
        },
        settings: {
          language: "en",
          timeZone: "UTC",
          view: "settings",
        },
      };

      renderWithProviders(<SettingsPage />, stateWithUserTimeZone);

      expect(screen.getByDisplayValue(/America\/New York/i)).toBeDefined();
    });

    it("updates timezone immediately (optimistic update)", async () => {
      const { store } = renderWithProviders(<SettingsPage />, preloadedState);

      const timezoneInput = screen.getAllByRole("combobox")[1];

      // Clear the input and type new timezone
      fireEvent.change(timezoneInput, { target: { value: "Europe/Paris" } });

      // Find and click the timezone option from the dropdown
      const option = await screen.findByText(/Europe\/Paris/i);
      fireEvent.click(option);

      // Timezone should be updated immediately (optimistic update)
      await waitFor(() => {
        const state = store.getState();
        expect(state.user?.timezone).toBe("Europe/Paris");
        expect(state.settings.timeZone).toBe("Europe/Paris");
      });
    });

    it("handles timezone change with different timezone values", async () => {
      const { store } = renderWithProviders(<SettingsPage />, preloadedState);

      const timezoneInput = screen.getAllByRole("combobox")[1];

      // Test with Asia/Tokyo
      fireEvent.change(timezoneInput, { target: { value: "Asia/Tokyo" } });
      const tokyoOption = await screen.findByText(/Asia\/Tokyo/i);
      fireEvent.click(tokyoOption);

      await waitFor(() => {
        const state = store.getState();
        expect(state.user?.timezone).toBe("Asia/Tokyo");
        expect(state.settings.timeZone).toBe("Asia/Tokyo");
      });

      // Test with America/Los_Angeles
      fireEvent.change(timezoneInput, {
        target: { value: "America/Los_Angeles" },
      });
      const laOption = await screen.findByText(/America\/Los Angeles/i);
      fireEvent.click(laOption);

      await waitFor(() => {
        const state = store.getState();
        expect(state.user?.timezone).toBe("America/Los_Angeles");
        expect(state.settings.timeZone).toBe("America/Los_Angeles");
      });
    });

    it("uses UTC as default timezone when no timezone is set", () => {
      const stateWithoutTimeZone = {
        user: {
          userData: {
            sub: "test",
            email: "test@test.com",
            family_name: "Doe",
            name: "John",
            sid: "mockSid",
            openpaasId: "667037022b752d0026472254",
          },
          organiserData: null,
          tokens: null,
          language: "en",
          timezone: undefined,
          loading: false,
          error: null,
        },
        settings: {
          language: "en",
          timeZone: undefined,
          view: "settings",
        },
      };

      renderWithProviders(<SettingsPage />, stateWithoutTimeZone);

      const timezoneInput = screen.getByDisplayValue(/UTC/i);
      expect(timezoneInput).toBeDefined();
    });
  });
});
