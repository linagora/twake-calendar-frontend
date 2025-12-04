import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import SettingsPage from "../../../src/features/Settings/SettingsPage";
import settingsReducer, {
  setIsBrowserDefaultTimeZone,
  setTimeZone,
} from "../../../src/features/Settings/SettingsSlice";
import userReducer, {
  getOpenPaasUserDataAsync,
  setTimezone as setUserTimeZone,
} from "../../../src/features/User/userSlice";
import { api } from "../../../src/utils/apiUtils";
import { browserDefaultTimeZone } from "../../../src/utils/timezone";
import { renderWithProviders } from "../../utils/Renderwithproviders";

describe("Timezone synchronization after getOpenPaasUserDataAsync", () => {
  let apiGetSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    apiGetSpy = jest.spyOn(api, "get");
  });

  afterEach(() => {
    apiGetSpy.mockRestore();
  });

  it("should sync timezone to both user and settings state after fetching user data", async () => {
    const mockUserData = {
      id: "667037022b752d0026472254",
      firstname: "John",
      lastname: "Doe",
      preferredEmail: ["test@test.com"],
      configurations: {
        modules: [
          {
            name: "core",
            configurations: [
              { name: "language", value: "fr" },
              { name: "datetime", value: { timeZone: "Europe/Paris" } },
            ],
          },
        ],
      },
    };

    // Return a fake fetch-like response
    apiGetSpy.mockResolvedValue({
      json: async () => mockUserData,
    });

    const store = configureStore({
      reducer: { user: userReducer, settings: settingsReducer },
      preloadedState: {
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
          coreConfig: { language: "en", datetime: { timeZone: "UTC" } },
          loading: false,
          error: null,
        },
        settings: { language: "en", timeZone: "UTC", view: "calendar" },
      },
    });

    const result = await store.dispatch(getOpenPaasUserDataAsync());

    expect(result.type).toBe("user/getOpenPaasUserData/fulfilled");

    const state = store.getState();
    expect(state.user.coreConfig.datetime.timeZone).toBe("Europe/Paris");
    expect(state.settings.timeZone).toBe("Europe/Paris");
    expect(localStorage.getItem("timeZone")).toBe("Europe/Paris");
  });

  it("should keep browser timezone if API response has no timezone configuration", async () => {
    const mockUserData = {
      id: "667037022b752d0026472254",
      firstname: "John",
      lastname: "Doe",
      preferredEmail: "[test@test.com](mailto:test@test.com)",
      configurations: {
        modules: [
          { name: "core", configurations: [{ name: "language", value: "en" }] },
        ],
      },
    };

    apiGetSpy.mockResolvedValue({
      json: async () => mockUserData,
    });

    const browserTimezone = browserDefaultTimeZone ?? "UTC";

    const store = configureStore({
      reducer: { user: userReducer, settings: settingsReducer },
      preloadedState: {
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
          coreConfig: {
            language: "en",
            datetime: { timeZone: browserTimezone },
          },
          loading: false,
          error: null,
        },
        settings: {
          language: "en",
          timeZone: browserTimezone,
          view: "calendar",
        },
      },
    });

    const result = await store.dispatch(getOpenPaasUserDataAsync());

    expect(result.type).toBe("user/getOpenPaasUserData/fulfilled");

    const state = store.getState();
    expect(state.user.coreConfig.datetime.timeZone).toBe(null);
    expect(state.settings.timeZone).toBe(browserTimezone);
  });
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Timezone Logic - Backend to Frontend Flow", () => {
  let store: any;

  beforeEach(() => {
    localStorageMock.clear();
    store = configureStore({
      reducer: {
        settings: settingsReducer,
        user: userReducer,
      },
      preloadedState: {
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
          coreConfig: { language: "en", datetime: { timeZone: "UTC" } },
          loading: false,
          error: null,
        },
        settings: { language: "en", timeZone: "UTC", view: "calendar" },
      },
    });
  });

  describe("Backend Response Handling", () => {
    test("Backend returns NULL => Should use browser default timezone", async () => {
      const backendResponse = {
        firstname: "John",
        lastname: "Doe",
        id: "123",
        preferredEmail: "john@example.com",
        configurations: {
          modules: [
            {
              name: "core",
              configurations: [
                {
                  name: "datetime",
                  value: {
                    timeZone: null,
                  },
                },
              ],
            },
          ],
        },
      };

      await store.dispatch(
        getOpenPaasUserDataAsync.fulfilled(backendResponse, "", undefined)
      );

      const settingsState = store.getState().settings;
      const userState = store.getState().user;

      expect(settingsState.timeZone).toBe(browserDefaultTimeZone);
      expect(settingsState.isBrowserDefaultTimeZone).toBe(true);
      expect(userState.coreConfig.datetime.timeZone).toBe(null);
      expect(localStorage.getItem("timeZone")).toBe(browserDefaultTimeZone);
    });

    test("Backend returns SPECIFIC VALUE => Should use that value", async () => {
      const specificTimezone = "America/New_York";
      const backendResponse = {
        firstname: "Jane",
        lastname: "Smith",
        id: "456",
        preferredEmail: "jane@example.com",
        configurations: {
          modules: [
            {
              name: "core",
              configurations: [
                {
                  name: "datetime",
                  value: {
                    timeZone: specificTimezone,
                  },
                },
              ],
            },
          ],
        },
      };

      await store.dispatch(
        getOpenPaasUserDataAsync.fulfilled(backendResponse, "", undefined)
      );

      const settingsState = store.getState().settings;
      const userState = store.getState().user;

      expect(settingsState.timeZone).toBe(specificTimezone);
      expect(settingsState.isBrowserDefaultTimeZone).toBe(false);
      expect(userState.coreConfig.datetime.timeZone).toBe(specificTimezone);
      expect(localStorage.getItem("timeZone")).toBe(specificTimezone);
    });

    test("Backend returns NO datetime config => Should use browser default", async () => {
      const backendResponse = {
        firstname: "Bob",
        lastname: "Johnson",
        id: "789",
        preferredEmail: "bob@example.com",
        configurations: {
          modules: [
            {
              name: "core",
              configurations: [
                // No datetime config
              ],
            },
          ],
        },
      };

      await store.dispatch(
        getOpenPaasUserDataAsync.fulfilled(backendResponse, "", undefined)
      );

      const settingsState = store.getState().settings;
      const userState = store.getState().user;

      expect(settingsState.timeZone).toBe(browserDefaultTimeZone);
      expect(settingsState.isBrowserDefaultTimeZone).toBe(true);
      expect(userState.coreConfig.datetime.timeZone).toBe(null);
      expect(localStorage.getItem("timeZone")).toBe(browserDefaultTimeZone);
    });
  });

  test("Settings state ALWAYS has a concrete value (never null)", () => {
    // Test 1: Browser default scenario
    store.dispatch(setIsBrowserDefaultTimeZone(true));
    let settingsState = store.getState().settings;

    expect(settingsState.timeZone).toBe(browserDefaultTimeZone);
    expect(settingsState.timeZone).not.toBe(null);

    // Test 2: Specific timezone scenario
    store.dispatch(setTimeZone("Europe/Paris"));
    settingsState = store.getState().settings;

    expect(settingsState.timeZone).toBe("Europe/Paris");
    expect(settingsState.timeZone).not.toBe(null);
  });

  describe("User Actions - Changing Timezone", () => {
    test("User enables browser default => Settings gets browser TZ, User gets null", async () => {
      const { store } = renderWithProviders(<SettingsPage />, {
        user: {
          userData: { sub: "test" },
          organiserData: null,
          tokens: null,
          coreConfig: {
            language: "en",
            datetime: { timeZone: "America/Los_Angeles" },
          },
          loading: false,
          error: null,
        },
        settings: {
          language: "en",
          timeZone: "America/Los_Angeles",
          isBrowserDefaultTimeZone: false,
          view: "settings",
        },
      });

      const browserDefaultSwitch = screen.getAllByLabelText(
        "settings.timeZoneBrowserDefault"
      )[0];
      expect(browserDefaultSwitch).toBeInTheDocument();

      // Enable browser default
      fireEvent.click(browserDefaultSwitch);

      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.isBrowserDefaultTimeZone).toBe(true);
      });
      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.timeZone).toBe(browserDefaultTimeZone);
      });
      await waitFor(() => {
        const state = store.getState();
        expect(state.user.coreConfig.datetime.timeZone).toBe(null);
      });
    });

    test("User selects specific timezone => Both states get the value", async () => {
      const { store } = renderWithProviders(<SettingsPage />, {
        user: {
          userData: { sub: "test" },
          organiserData: null,
          tokens: null,
          coreConfig: { language: "en", datetime: { timeZone: null } },
          loading: false,
          error: null,
        },
        settings: {
          language: "en",
          timeZone: browserDefaultTimeZone,
          isBrowserDefaultTimeZone: true,
          view: "settings",
        },
      });

      const browserDefaultSwitch = screen.getAllByLabelText(
        "settings.timeZoneBrowserDefault"
      )[0];

      // Disable browser default so manual selector appears
      fireEvent.click(browserDefaultSwitch);

      // Now timezone combobox is visible
      const timezoneInput = screen.getAllByRole("combobox")[1];

      // Type to filter options
      fireEvent.change(timezoneInput, {
        target: { value: "Australia/Sydney" },
      });

      // Select from autocomplete dropdown
      const option = await screen.findByText(/Australia\/Sydney/i);
      fireEvent.click(option);

      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.isBrowserDefaultTimeZone).toBe(false);
      });
      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.timeZone).toBe("Australia/Sydney");
      });
      await waitFor(() => {
        const state = store.getState();
        expect(state.user.coreConfig.datetime.timeZone).toBe(
          "Australia/Sydney"
        );
      });
    });
  });

  describe("LocalStorage Persistence", () => {
    test("LocalStorage always stores concrete values (browser TZ or specific TZ)", () => {
      // Scenario 1: Browser default
      store.dispatch(setTimeZone(browserDefaultTimeZone));
      expect(localStorage.getItem("timeZone")).toBe(browserDefaultTimeZone);
      expect(localStorage.getItem("timeZone")).not.toBe("null");

      // Scenario 2: Specific timezone
      store.dispatch(setTimeZone("Africa/Cairo"));
      expect(localStorage.getItem("timeZone")).toBe("Africa/Cairo");
    });
  });

  test("Full user journey: Backend null -> User changes -> Backend saves", async () => {
    // Step 1: Backend returns null
    const backendResponseNull = {
      firstname: "Test",
      lastname: "User",
      id: "999",
      preferredEmail: "test@example.com",
      configurations: {
        modules: [
          {
            name: "core",
            configurations: [
              {
                name: "datetime",
                value: { timeZone: null },
              },
            ],
          },
        ],
      },
    };

    await store.dispatch(
      getOpenPaasUserDataAsync.fulfilled(backendResponseNull, "", undefined)
    );

    // Verify initial state
    expect(store.getState().settings.timeZone).toBe(browserDefaultTimeZone);
    expect(store.getState().user.coreConfig.datetime.timeZone).toBe(null);

    // Step 2: User changes to specific timezone
    const userSelectedTZ = "Europe/London";
    store.dispatch(setIsBrowserDefaultTimeZone(false));
    store.dispatch(setTimeZone(userSelectedTZ));
    store.dispatch(setUserTimeZone(userSelectedTZ));

    expect(store.getState().settings.timeZone).toBe(userSelectedTZ);
    expect(store.getState().user.coreConfig.datetime.timeZone).toBe(
      userSelectedTZ
    );

    // Step 3: User switches back to browser default
    store.dispatch(setIsBrowserDefaultTimeZone(true));
    store.dispatch(setUserTimeZone(null));
    store.dispatch(setTimeZone(browserDefaultTimeZone));

    expect(store.getState().settings.timeZone).toBe(browserDefaultTimeZone);
    expect(store.getState().user.coreConfig.datetime.timeZone).toBe(null);
  });
});
