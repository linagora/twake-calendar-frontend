import { configureStore } from "@reduxjs/toolkit";
import userReducer, {
  getOpenPaasUserDataAsync,
} from "../../../src/features/User/userSlice";
import settingsReducer from "../../../src/features/Settings/SettingsSlice";
import { api } from "../../../src/utils/apiUtils";
import { browserDefaultTimeZone } from "../../../src/utils/timezone";

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
      preferredEmail: "[test@test.com](mailto:test@test.com)",
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
    expect(state.user.coreConfig.datetime.timeZone).toBe(browserTimezone);
    expect(state.settings.timeZone).toBe(browserTimezone);
  });
});
