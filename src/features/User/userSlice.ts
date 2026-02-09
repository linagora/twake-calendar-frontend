import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getOpenPaasUser,
  updateUserConfigurations,
  UserConfigurationUpdates,
} from "./userAPI";
import {
  ConfigurationItem,
  ModuleConfiguration,
  userData,
  userOrganiser,
} from "./userDataTypes";

// Type definitions for OpenPaaS user data
interface OpenPaasUser {
  firstname?: string;
  lastname?: string;
  id?: string;
  preferredEmail?: string;
  configurations?: {
    modules?: Array<{
      name: string;
      configurations?: Array<{
        name: string;
        value: unknown;
      }>;
    }>;
  };
}

// Type for core config datetime
interface DatetimeConfig {
  timeZone: string | null;
  [key: string]: unknown;
}

// Type for core config
interface CoreConfig {
  language: string | null;
  datetime: DatetimeConfig;
  [key: string]: unknown;
}

export const getOpenPaasUserDataAsync = createAsyncThunk<
  OpenPaasUser,
  void,
  { rejectValue: { message: string; status?: number } }
>("user/getOpenPaasUserData", async (_, { rejectWithValue }) => {
  try {
    const user = await getOpenPaasUser();
    return user as OpenPaasUser;
  } catch (err) {
    const error = err as { response?: { status?: number } };
    return rejectWithValue({
      message: formatReduxError(err),
      status: error.response?.status,
    });
  }
});

export const updateUserConfigurationsAsync = createAsyncThunk<
  UserConfigurationUpdates,
  UserConfigurationUpdates,
  { rejectValue: { message: string; status?: number } }
>("user/updateConfigurations", async (updates, { rejectWithValue }) => {
  try {
    await updateUserConfigurations(updates);
    return updates;
  } catch (err) {
    const error = err as { response?: { status?: number } };
    return rejectWithValue({
      message: formatReduxError(err),
      status: error.response?.status,
    });
  }
});

export const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null as unknown as userData,
    organiserData: null as unknown as userOrganiser,
    tokens: null as unknown as Record<string, string>,
    coreConfig: {
      language: null,
      datetime: {
        timeZone: null,
      },
    } as CoreConfig,
    alarmEmailsEnabled: null as boolean | null,
    loading: true,
    error: null as unknown as string | null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      if (!state.organiserData) {
        state.organiserData = {} as userOrganiser;
      }
      state.organiserData.cn = action.payload.sub;
      state.organiserData.cal_address = `mailto:${action.payload.email}`;
      state.loading = false;
    },
    setTokens: (state, action) => {
      state.tokens = action.payload;
    },
    setLanguage: (state, action) => {
      state.coreConfig.language = action.payload;
      if (state.userData) {
        state.userData.language = action.payload;
      }
    },
    setTimezone: (state, action) => {
      if (!state.coreConfig.datetime) {
        state.coreConfig.datetime = { timeZone: null };
      }
      state.coreConfig.datetime.timeZone = action.payload;
      if (state.userData) {
        state.userData.timezone = action.payload;
      }
    },
    setAlarmEmails: (state, action) => {
      state.alarmEmailsEnabled = action.payload;
    },
    setUserError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getOpenPaasUserDataAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.userData.name = action.payload.firstname;
        state.userData.family_name = action.payload.lastname;
        state.userData.openpaasId = action.payload.id;
        if (!state.organiserData) {
          state.organiserData = {} as userOrganiser;
        }
        if (action.payload.firstname && action.payload.lastname) {
          state.organiserData.cn = `${action.payload.firstname} ${action.payload.lastname}`;
        }
        if (action.payload.preferredEmail) {
          state.organiserData.cal_address = action.payload.preferredEmail;
          state.userData.email = action.payload.preferredEmail;
        }
        // Extract data from configurations.modules
        if (action.payload.configurations?.modules) {
          const coreModule = action.payload.configurations.modules.find(
            (module: ModuleConfiguration) => module.name === "core"
          );
          if (coreModule?.configurations) {
            const newCoreConfig = Object.fromEntries(
              coreModule.configurations.map((e: ConfigurationItem) => [
                e.name,
                e.value,
              ])
            );
            state.coreConfig = {
              ...state.coreConfig,
              ...newCoreConfig,
            } as CoreConfig;
            const languageConfig = coreModule.configurations.find(
              (config: ConfigurationItem) => config.name === "language"
            );
            if (languageConfig?.value) {
              state.coreConfig.language = languageConfig.value as string;
              if (state.userData)
                state.userData.language = languageConfig.value as string;
            }
            const datetimeConfig = coreModule.configurations.find(
              (config: ConfigurationItem) => config.name === "datetime"
            );
            if (datetimeConfig?.value) {
              const datetimeValue = datetimeConfig.value as {
                timeZone?: string;
              };
              const serverTimeZone = datetimeValue.timeZone;
              state.coreConfig.datetime = {
                ...state.coreConfig.datetime,
                ...(datetimeConfig.value as object),
                timeZone: serverTimeZone !== undefined ? serverTimeZone : null,
              };
              if (state.userData) {
                state.userData.timezone =
                  serverTimeZone !== undefined ? serverTimeZone : null;
              }
            } else {
              state.coreConfig.datetime = {
                ...state.coreConfig.datetime,
                timeZone: null,
              };
              if (state.userData) {
                state.userData.timezone = null;
              }
            }
          }
          // Extract alarmEmails from configurations.modules
          const calendarModule = action.payload.configurations.modules.find(
            (module: ModuleConfiguration) => module.name === "calendar"
          );
          if (calendarModule?.configurations) {
            const alarmEmailsConfig = calendarModule.configurations.find(
              (config: ConfigurationItem) => config.name === "alarmEmails"
            );
            if (alarmEmailsConfig) {
              state.alarmEmailsEnabled = alarmEmailsConfig.value === true;
            }
          }
        }
      })
      .addCase(getOpenPaasUserDataAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(getOpenPaasUserDataAsync.rejected, (state, action) => {
        state.loading = false;
        if (action.payload?.status !== 401) {
          state.error =
            action.payload?.message || "Failed to fetch user information";
        }
      })
      .addCase(updateUserConfigurationsAsync.fulfilled, (state, action) => {
        if (action.payload.language !== undefined) {
          state.coreConfig.language = action.payload.language;
          if (state.userData) {
            state.userData.language = action.payload.language;
          }
        }
        if (action.payload.timezone !== undefined) {
          if (!state.coreConfig.datetime) {
            state.coreConfig.datetime = { timeZone: null };
          }
          state.coreConfig.datetime.timeZone = action.payload.timezone;
          if (state.userData) {
            state.userData.timezone = action.payload.timezone;
          }
        }
        if (action.payload.alarmEmails !== undefined) {
          state.alarmEmailsEnabled = action.payload.alarmEmails === true;
        }
      })
      .addCase(updateUserConfigurationsAsync.rejected, (state, action) => {
        if (action.payload?.status !== 401) {
          state.error =
            action.payload?.message || "Failed to update user configurations";
        }
      });
  },
});

// Action creators are generated for each case reducer function
export const {
  setUserData,
  setTokens,
  setLanguage,
  setTimezone,
  setAlarmEmails,
  setUserError,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;
