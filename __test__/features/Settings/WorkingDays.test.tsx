import SettingsPage from "@/features/Settings/SettingsPage";
import settingsReducer from "@/features/Settings/SettingsSlice";
import userReducer, {
  getOpenPaasUserDataAsync,
} from "@/features/User/userSlice";
import { api } from "@/utils/apiUtils";
import { configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../utils/Renderwithproviders";

jest.mock("@/utils/apiUtils");

const basePreloadedState = {
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
      datetime: { timeZone: "UTC" },
    },
    alarmEmailsEnabled: false,
    loading: false,
    error: null,
  },
  settings: {
    language: "en",
    timeZone: "UTC",
    isBrowserDefaultTimeZone: false,
    view: "settings",
    businessHours: {
      start: "8:0",
      end: "19:0",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    workingDays: false,
  },
};

describe("Working Days and Business Hours Settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.patch as jest.Mock).mockResolvedValue({ status: 204 });
  });

  describe("Initial rendering", () => {
    it("renders the working days section with day selector", () => {
      renderWithProviders(<SettingsPage />, basePreloadedState);

      expect(
        screen.getByText("settings.chooseWorkingDays")
      ).toBeInTheDocument();
    });

    it("renders the show only working days toggle", () => {
      renderWithProviders(<SettingsPage />, basePreloadedState);

      expect(
        screen.getByRole("switch", { name: /settings.showOnlyWorkingDays/i })
      ).toBeInTheDocument();
    });

    it("shows working days toggle as unchecked when workingDays is false", () => {
      renderWithProviders(<SettingsPage />, basePreloadedState);

      const toggle = screen.getByRole("switch", {
        name: /settings.showOnlyWorkingDays/i,
      }) as HTMLInputElement;
      expect(toggle.checked).toBe(false);
    });

    it("shows working days toggle as checked when workingDays is true", () => {
      renderWithProviders(<SettingsPage />, {
        ...basePreloadedState,
        settings: { ...basePreloadedState.settings, workingDays: true },
      });

      const toggle = screen.getByRole("switch", {
        name: /settings.showOnlyWorkingDays/i,
      }) as HTMLInputElement;
      expect(toggle.checked).toBe(true);
    });

    it("shows working days toggle as unchecked when workingDays is null", () => {
      renderWithProviders(<SettingsPage />, {
        ...basePreloadedState,
        settings: { ...basePreloadedState.settings, workingDays: null },
      });

      const toggle = screen.getByRole("switch", {
        name: /settings.showOnlyWorkingDays/i,
      }) as HTMLInputElement;
      expect(toggle.checked).toBe(false);
    });
  });

  describe("workingDays toggle", () => {
    it("updates workingDays immediately (optimistic update) and calls API", async () => {
      const { store } = renderWithProviders(
        <SettingsPage />,
        basePreloadedState
      );

      const toggle = screen.getByRole("switch", {
        name: /settings.showOnlyWorkingDays/i,
      });
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(store.getState().settings.workingDays).toBe(true);
      });

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "api/configurations?scope=user",
          expect.objectContaining({
            json: expect.arrayContaining([
              expect.objectContaining({
                name: "linagora.esn.calendar",
                configurations: expect.arrayContaining([
                  expect.objectContaining({
                    name: "workingDays",
                    value: true,
                  }),
                ]),
              }),
            ]),
          })
        );
      });
    });

    it("rolls back workingDays if API call fails", async () => {
      (api.patch as jest.Mock).mockRejectedValue(new Error("API Error"));

      const { store } = renderWithProviders(
        <SettingsPage />,
        basePreloadedState
      );

      const toggle = screen.getByRole("switch", {
        name: /settings.showOnlyWorkingDays/i,
      });
      fireEvent.click(toggle);

      await waitFor(
        () => {
          expect(store.getState().settings.workingDays).toBe(false);
        },
        { timeout: 3000 }
      );

      await waitFor(() => {
        expect(
          screen.getByText("settings.workingDaysUpdateError")
        ).toBeInTheDocument();
      });
    });

    it("toggles workingDays from true to false", async () => {
      const { store } = renderWithProviders(<SettingsPage />, {
        ...basePreloadedState,
        settings: { ...basePreloadedState.settings, workingDays: true },
      });

      const toggle = screen.getByRole("switch", {
        name: /settings.showOnlyWorkingDays/i,
      });
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(store.getState().settings.workingDays).toBe(false);
      });

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "api/configurations?scope=user",
          expect.objectContaining({
            json: expect.arrayContaining([
              expect.objectContaining({
                name: "linagora.esn.calendar",
                configurations: expect.arrayContaining([
                  expect.objectContaining({
                    name: "workingDays",
                    value: false,
                  }),
                ]),
              }),
            ]),
          })
        );
      });
    });
  });

  describe("businessHours day selector", () => {
    it("updates businessHours in Redux immediately when a day is clicked", async () => {
      const { store } = renderWithProviders(
        <SettingsPage />,
        basePreloadedState
      );

      // Sunday (0) is not in initial daysOfWeek [1,2,3,4,5], click it to add
      const sundayButton = screen.getByRole("button", {
        name: /sunday/i,
      });
      fireEvent.click(sundayButton);

      await waitFor(() => {
        expect(store.getState().settings.businessHours?.daysOfWeek).toContain(
          0
        );
      });
    });

    it("removes a day from businessHours when an already selected day is clicked", async () => {
      const { store } = renderWithProviders(
        <SettingsPage />,
        basePreloadedState
      );

      // Monday (1) is in initial daysOfWeek, click to remove
      const mondayButton = screen.getByRole("button", { name: /monday/i });
      fireEvent.click(mondayButton);

      await waitFor(() => {
        expect(
          store.getState().settings.businessHours?.daysOfWeek
        ).not.toContain(1);
      });
    });

    it("debounces API call when multiple days are clicked rapidly", async () => {
      jest.useFakeTimers();

      renderWithProviders(<SettingsPage />, basePreloadedState);

      const sundayButton = screen.getByRole("button", { name: /sunday/i });
      const saturdayButton = screen.getByRole("button", { name: /saturday/i });

      fireEvent.click(sundayButton);
      fireEvent.click(saturdayButton);
      fireEvent.click(sundayButton);

      // API should not have been called yet
      expect(api.patch).not.toHaveBeenCalled();

      // Advance timers past debounce threshold
      jest.runAllTimers();

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });

    it("sends businessHours as array to API", async () => {
      jest.useFakeTimers();

      renderWithProviders(<SettingsPage />, basePreloadedState);

      const sundayButton = screen.getByRole("button", { name: /sunday/i });
      fireEvent.click(sundayButton);

      jest.runAllTimers();

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "api/configurations?scope=user",
          expect.objectContaining({
            json: expect.arrayContaining([
              expect.objectContaining({
                name: "core",
                configurations: expect.arrayContaining([
                  expect.objectContaining({
                    name: "businessHours",
                    value: expect.arrayContaining([
                      expect.objectContaining({
                        start: "8:0",
                        end: "19:0",
                        daysOfWeek: expect.arrayContaining([0]),
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      jest.useRealTimers();
    });

    it("rolls back businessHours if API call fails", async () => {
      jest.useFakeTimers();
      (api.patch as jest.Mock).mockRejectedValue(new Error("API Error"));

      const { store } = renderWithProviders(
        <SettingsPage />,
        basePreloadedState
      );

      const sundayButton = screen.getByRole("button", { name: /sunday/i });
      fireEvent.click(sundayButton);

      jest.runAllTimers();

      await waitFor(
        () => {
          expect(
            store.getState().settings.businessHours?.daysOfWeek
          ).not.toContain(0);
        },
        { timeout: 3000 }
      );

      await waitFor(() => {
        expect(
          screen.getByText("settings.workingDaysUpdateError")
        ).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe("getOpenPaasUserDataAsync integration", () => {
    it("populates businessHours from core module configurations", async () => {
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
            alarmEmailsEnabled: null,
            loading: false,
            error: null,
          },
          settings: {
            language: "en",
            timeZone: "UTC",
            isBrowserDefaultTimeZone: false,
            view: "calendar",
            businessHours: null,
            workingDays: null,
          },
        },
      });

      const mockResponse = {
        id: "667037022b752d0026472254",
        firstname: "John",
        lastname: "Doe",
        preferredEmail: "test@test.com",
        configurations: {
          modules: [
            {
              name: "core",
              configurations: [
                {
                  name: "businessHours",
                  value: [
                    { start: "8:0", end: "19:0", daysOfWeek: [1, 2, 3, 4, 5] },
                  ],
                },
              ],
            },
            {
              name: "linagora.esn.calendar",
              configurations: [{ name: "workingDays", value: true }],
            },
          ],
        },
      };

      await store.dispatch(
        getOpenPaasUserDataAsync.fulfilled(mockResponse, "", undefined)
      );

      const state = store.getState();
      expect(state.settings.businessHours).toEqual({
        start: "8:0",
        end: "19:0",
        daysOfWeek: [1, 2, 3, 4, 5],
      });
      expect(state.settings.workingDays).toBe(true);
    });

    it("sets businessHours to null when not present in API response", async () => {
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
            alarmEmailsEnabled: null,
            loading: false,
            error: null,
          },
          settings: {
            language: "en",
            timeZone: "UTC",
            isBrowserDefaultTimeZone: false,
            view: "calendar",
            businessHours: null,
            workingDays: null,
          },
        },
      });

      const mockResponse = {
        id: "667037022b752d0026472254",
        firstname: "John",
        lastname: "Doe",
        preferredEmail: "test@test.com",
        configurations: {
          modules: [
            {
              name: "core",
              configurations: [],
            },
            {
              name: "linagora.esn.calendar",
              configurations: [{ name: "workingDays", value: null }],
            },
          ],
        },
      };

      await store.dispatch(
        getOpenPaasUserDataAsync.fulfilled(mockResponse, "", undefined)
      );

      const state = store.getState();
      expect(state.settings.businessHours).toBeNull();
      expect(state.settings.workingDays).toBeNull();
    });
  });
});
