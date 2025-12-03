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
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const sidebar = container.querySelector(".settings-sidebar");
    expect(sidebar).toBeInTheDocument();
    expect(screen.getAllByText(/settings.title/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/settings.notifications/i)).toBeInTheDocument();
  });

  it("highlights active navigation item", () => {
    const { container } = renderWithProviders(<SettingsPage />, preloadedState);

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
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
      screen.getByText(/settings.notifications.deliveryMethod/i)
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
        coreConfig: { language: "fr", datetime: { timeZone: "UTC" } },
        loading: false,
        error: null,
      },
      settings: {
        language: "en",
        timeZone: "UTC",
        isBrowserDefaultTimeZone: false,
        view: "settings",
      },
    };
    renderWithProviders(<SettingsPage />, stateWithUserLanguage);

    const languageSelect = screen.getByLabelText("settings.languageSelector");

    // Verify Select exists
    expect(languageSelect).toBeInTheDocument();

    // Verify that the underlying native input reflects the user language ("fr")
    // eslint-disable-next-line testing-library/no-node-access
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
    // eslint-disable-next-line testing-library/no-node-access
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
      expect(state.user?.coreConfig.language).toBe("fr");
    });
    await waitFor(() => {
      const state = store.getState();
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
    // eslint-disable-next-line testing-library/no-node-access
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
    // eslint-disable-next-line testing-library/no-node-access
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
    await waitFor(() => {
      const state = store.getState();
      expect(state.user?.coreConfig.language).toBe("en");
    });
    await waitFor(
      () => {
        const state = store.getState();
        expect(state.settings.language).toBe("en");
      },
      { timeout: 3000 }
    );
  });

  it("shows Email toggle in Notifications tab", () => {
    renderWithProviders(<SettingsPage />, preloadedState);

    const notificationsTab = screen.getByRole("tab", {
      name: /settings.notifications/i,
    });
    fireEvent.click(notificationsTab);

    expect(
      screen.getByText(/settings.notifications.deliveryMethod/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /settings.notifications.email/i })
    ).toBeInTheDocument();
  });

  describe("Timezone Settings", () => {
    beforeEach(() => {
      (api.patch as jest.Mock).mockResolvedValue({ status: 204 });
    });
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
          coreConfig: {
            language: "en",
            datetime: { timeZone: "America/New_York" },
          },
          loading: false,
          error: null,
        },
        settings: {
          language: "en",
          timeZone: "UTC",
          isBrowserDefaultTimeZone: false,
          view: "settings",
        },
      };

      renderWithProviders(<SettingsPage />, stateWithUserTimeZone);

      expect(screen.getByDisplayValue(/America\/New York/i)).toBeDefined();
    });

    it("updates timezone immediately (optimistic update) and calls API", async () => {
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
        expect(state.user?.coreConfig.datetime.timeZone).toBe("Europe/Paris");
      });
      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.timeZone).toBe("Europe/Paris");
      });

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "api/configurations?scope=user",
          expect.objectContaining({
            json: expect.arrayContaining([
              expect.objectContaining({
                name: "core",
                configurations: expect.arrayContaining([
                  expect.objectContaining({
                    name: "datetime",
                    value: expect.objectContaining({
                      timeZone: "Europe/Paris",
                    }),
                  }),
                ]),
              }),
            ]),
          })
        );
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
        expect(state.user?.coreConfig.datetime.timeZone).toBe("Asia/Tokyo");
      });
      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.timeZone).toBe("Asia/Tokyo");
      });

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "api/configurations?scope=user",
          expect.objectContaining({
            json: expect.arrayContaining([
              expect.objectContaining({
                name: "core",
                configurations: expect.arrayContaining([
                  expect.objectContaining({
                    name: "datetime",
                    value: expect.objectContaining({
                      timeZone: "Asia/Tokyo",
                    }),
                  }),
                ]),
              }),
            ]),
          })
        );
      });

      jest.clearAllMocks();
      (api.patch as jest.Mock).mockResolvedValue({ status: 204 });

      fireEvent.change(timezoneInput, {
        target: { value: "America/Los_Angeles" },
      });
      const laOption = await screen.findByText(/America\/Los Angeles/i);
      fireEvent.click(laOption);

      await waitFor(() => {
        const state = store.getState();
        expect(state.user?.coreConfig.datetime.timeZone).toBe(
          "America/Los_Angeles"
        );
      });
      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.timeZone).toBe("America/Los_Angeles");
      });

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "api/configurations?scope=user",
          expect.objectContaining({
            json: expect.arrayContaining([
              expect.objectContaining({
                name: "core",
                configurations: expect.arrayContaining([
                  expect.objectContaining({
                    name: "datetime",
                    value: expect.objectContaining({
                      timeZone: "America/Los_Angeles",
                    }),
                  }),
                ]),
              }),
            ]),
          })
        );
      });
    });

    it("enables browser default timezone and calls API with null", async () => {
      const { store } = renderWithProviders(<SettingsPage />, preloadedState);

      const browserDefaultSwitch = screen.getByRole("switch", {
        name: /settings.timeZoneBrowserDefault/i,
      });

      expect(browserDefaultSwitch).not.toBeChecked();

      fireEvent.click(browserDefaultSwitch);

      await waitFor(() => {
        expect(browserDefaultSwitch).toBeChecked();
      });

      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.isBrowserDefaultTimeZone).toBe(true);
      });

      await waitFor(() => {
        const state = store.getState();
        expect(state.user?.coreConfig.datetime.timeZone).toBeNull();
      });

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "api/configurations?scope=user",
          expect.objectContaining({
            json: expect.arrayContaining([
              expect.objectContaining({
                name: "core",
                configurations: expect.arrayContaining([
                  expect.objectContaining({
                    name: "datetime",
                    value: expect.objectContaining({
                      timeZone: null,
                    }),
                  }),
                ]),
              }),
            ]),
          })
        );
      });
    });

    it("disables browser default timezone and shows timezone selector", async () => {
      const stateWithBrowserDefault = {
        ...preloadedState,
        user: {
          ...preloadedState.user,
          coreConfig: {
            language: "en",
            datetime: { timeZone: null },
          },
        },
        settings: {
          ...preloadedState.settings,
          isBrowserDefaultTimeZone: true,
        },
      };

      renderWithProviders(<SettingsPage />, stateWithBrowserDefault);

      const browserDefaultSwitch = screen.getByRole("switch", {
        name: /settings.timeZoneBrowserDefault/i,
      });

      expect(browserDefaultSwitch).toBeChecked();

      expect(screen.getAllByRole("combobox")).toHaveLength(1);

      fireEvent.click(browserDefaultSwitch);

      await waitFor(() => {
        expect(browserDefaultSwitch).not.toBeChecked();
      });

      await waitFor(() => {
        expect(screen.getAllByRole("combobox")).toHaveLength(2);
      });
    });

    it("rolls back timezone change if API call fails", async () => {
      (api.patch as jest.Mock).mockRejectedValue(new Error("API Error"));

      const { store } = renderWithProviders(<SettingsPage />, preloadedState);

      const timezoneInput = screen.getAllByRole("combobox")[1];

      fireEvent.change(timezoneInput, { target: { value: "Europe/Paris" } });
      const option = await screen.findByText(/Europe\/Paris/i);
      fireEvent.click(option);

      await waitFor(() => {
        const state = store.getState();
        expect(state.user?.coreConfig.datetime.timeZone).toBe("UTC");
      });
      await waitFor(
        () => {
          const state = store.getState();
          expect(state.settings.timeZone).toBe("UTC");
        },
        { timeout: 3000 }
      );

      await waitFor(() => {
        expect(
          screen.getByText("settings.timeZoneUpdateError")
        ).toBeInTheDocument();
      });
    });

    it("rolls back browser default change if API call fails", async () => {
      (api.patch as jest.Mock).mockRejectedValue(new Error("API Error"));

      const { store } = renderWithProviders(<SettingsPage />, preloadedState);

      const browserDefaultSwitch = screen.getByRole("switch", {
        name: /settings.timeZoneBrowserDefault/i,
      });

      fireEvent.click(browserDefaultSwitch);

      await waitFor(
        () => {
          const state = store.getState();
          expect(state.settings.isBrowserDefaultTimeZone).toBe(false);
        },
        { timeout: 3000 }
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.user?.coreConfig.datetime.timeZone).toBe("UTC");
      });

      await waitFor(() => {
        expect(
          screen.getByText("settings.timeZoneUpdateError")
        ).toBeInTheDocument();
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
          coreConfig: { language: "en", datetime: { timeZone: undefined } },
          loading: false,
          error: null,
        },
        settings: {
          language: "en",
          timeZone: undefined,
          isBrowserDefaultTimeZone: false,
          view: "settings",
        },
      };

      renderWithProviders(<SettingsPage />, stateWithoutTimeZone);

      const timezoneInput = screen.getByDisplayValue("(UTC) UTC");
      expect(timezoneInput).toBeDefined();
    });

    it("preserves other datetime properties when updating timezone", async () => {
      const stateWithDatetimeConfig = {
        ...preloadedState,
        user: {
          ...preloadedState.user,
          coreConfig: {
            language: "en",
            datetime: {
              timeZone: "UTC",
              format: "24h",
              firstDayOfWeek: 1,
            },
          },
        },
      };

      renderWithProviders(<SettingsPage />, stateWithDatetimeConfig);

      const timezoneInput = screen.getAllByRole("combobox")[1];

      fireEvent.change(timezoneInput, { target: { value: "Europe/Paris" } });
      const option = await screen.findByText(/Europe\/Paris/i);
      fireEvent.click(option);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "api/configurations?scope=user",
          expect.objectContaining({
            json: expect.arrayContaining([
              expect.objectContaining({
                name: "core",
                configurations: expect.arrayContaining([
                  expect.objectContaining({
                    name: "datetime",
                    value: {
                      timeZone: "Europe/Paris",
                      format: "24h",
                      firstDayOfWeek: 1,
                    },
                  }),
                ]),
              }),
            ]),
          })
        );
      });
    });

    describe("Alarm Emails Settings", () => {
      beforeEach(() => {
        (api.patch as jest.Mock).mockResolvedValue({ status: 204 });
      });

      it("displays alarmEmails toggle with correct initial state", () => {
        const stateWithAlarmEmailsEnabled = {
          ...preloadedState,
          user: {
            ...preloadedState.user,
            alarmEmailsEnabled: true,
          },
        };
        renderWithProviders(<SettingsPage />, stateWithAlarmEmailsEnabled);

        const notificationsTab = screen.getByRole("tab", {
          name: /settings.notifications/i,
        });
        fireEvent.click(notificationsTab);

        const toggle = screen.getByRole("switch", {
          name: /settings.notifications.email/i,
        }) as HTMLInputElement;
        expect(toggle).toBeInTheDocument();
        expect(toggle.checked).toBe(true);
      });

      it("displays alarmEmails toggle as true when alarmEmailsEnabled is null", () => {
        const stateWithNullAlarmEmails = {
          ...preloadedState,
          user: {
            ...preloadedState.user,
            alarmEmailsEnabled: null,
          },
        };
        renderWithProviders(<SettingsPage />, stateWithNullAlarmEmails);

        const notificationsTab = screen.getByRole("tab", {
          name: /settings.notifications/i,
        });
        fireEvent.click(notificationsTab);

        const toggle = screen.getByRole("switch", {
          name: /settings.notifications.email/i,
        }) as HTMLInputElement;
        expect(toggle).toBeInTheDocument();
        expect(toggle.checked).toBe(true);
      });

      it("updates alarmEmails immediately (optimistic update) and calls API in background", async () => {
        (api.patch as jest.Mock).mockResolvedValue({ status: 204 });

        const { store } = renderWithProviders(<SettingsPage />, preloadedState);

        const notificationsTab = screen.getByRole("tab", {
          name: /settings.notifications/i,
        });
        fireEvent.click(notificationsTab);

        const toggle = screen.getByRole("switch", {
          name: /settings.notifications.email/i,
        }) as HTMLInputElement;
        expect(toggle.checked).toBe(false);

        fireEvent.click(toggle);

        // AlarmEmails should be updated immediately (optimistic update)
        await waitFor(() => {
          const state = store.getState();
          expect(state.user?.alarmEmailsEnabled).toBe(true);
        });

        // API should be called in background
        await waitFor(() => {
          expect(api.patch).toHaveBeenCalledWith(
            "api/configurations?scope=user",
            expect.objectContaining({
              json: expect.arrayContaining([
                expect.objectContaining({
                  name: "calendar",
                  configurations: expect.arrayContaining([
                    expect.objectContaining({
                      name: "alarmEmails",
                      value: true,
                    }),
                  ]),
                }),
              ]),
            })
          );
        });
      });

      it("rolls back alarmEmails change if API call fails", async () => {
        (api.patch as jest.Mock).mockRejectedValue(new Error("API Error"));

        const { store } = renderWithProviders(<SettingsPage />, preloadedState);

        const notificationsTab = screen.getByRole("tab", {
          name: /settings.notifications/i,
        });
        fireEvent.click(notificationsTab);

        const toggle = screen.getByRole("switch", {
          name: /settings.notifications.email/i,
        }) as HTMLInputElement;
        expect(toggle.checked).toBe(false);

        fireEvent.click(toggle);

        // Wait for rollback - alarmEmails should be rolled back to false after error
        await waitFor(
          () => {
            const state = store.getState();
            expect(state.user?.alarmEmailsEnabled).toBe(false);
          },
          { timeout: 3000 }
        );
      });

      it("sends false value when toggle is turned off", async () => {
        (api.patch as jest.Mock).mockResolvedValue({ status: 204 });

        const stateWithAlarmEmailsEnabled = {
          ...preloadedState,
          user: {
            ...preloadedState.user,
            alarmEmailsEnabled: true,
          },
        };

        const { store } = renderWithProviders(
          <SettingsPage />,
          stateWithAlarmEmailsEnabled
        );

        const notificationsTab = screen.getByRole("tab", {
          name: /settings.notifications/i,
        });
        fireEvent.click(notificationsTab);

        const toggle = screen.getByRole("switch", {
          name: /settings.notifications.email/i,
        }) as HTMLInputElement;
        expect(toggle.checked).toBe(true);

        fireEvent.click(toggle);

        // AlarmEmails should be updated immediately (optimistic update)
        await waitFor(() => {
          const state = store.getState();
          expect(state.user?.alarmEmailsEnabled).toBe(false);
        });

        // API should be called with false value
        await waitFor(() => {
          expect(api.patch).toHaveBeenCalledWith(
            "api/configurations?scope=user",
            expect.objectContaining({
              json: expect.arrayContaining([
                expect.objectContaining({
                  name: "calendar",
                  configurations: expect.arrayContaining([
                    expect.objectContaining({
                      name: "alarmEmails",
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
  });
});
