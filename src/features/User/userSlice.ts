import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { userData, userOrganiser } from "./userDataTypes";
import {
  getOpenPaasUser,
  updateUserConfigurations,
  UserConfigurationUpdates,
} from "./userAPI";
import { formatReduxError } from "../../utils/errorUtils";

export const getOpenPaasUserDataAsync = createAsyncThunk<
  Record<string, any>,
  void,
  { rejectValue: { message: string; status?: number } }
>("user/getOpenPaasUserData", async (_, { rejectWithValue }) => {
  try {
    const user = (await getOpenPaasUser()) as Record<string, any>;
    return user;
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
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
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});

export const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null as unknown as userData,
    organiserData: null as unknown as userOrganiser,
    tokens: null as unknown as Record<string, string>,
    language: null as string | null,
    timezone: null as string | null,
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
      state.language = action.payload;
      if (state.userData) {
        state.userData.language = action.payload;
      }
    },
    setTimezone: (state, action) => {
      state.timezone = action.payload;
      if (state.userData) {
        state.userData.timezone = action.payload;
      }
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
            (module: any) => module.name === "core"
          );
          if (coreModule?.configurations) {
            const languageConfig = coreModule.configurations.find(
              (config: any) => config.name === "language"
            );
            if (languageConfig?.value) {
              state.language = languageConfig.value;
              state.userData.language = languageConfig.value;
            }
            const datetimeConfig = coreModule.configurations.find(
              (config: any) => config.name === "datetime"
            );
            if (datetimeConfig?.value) {
              state.timezone = datetimeConfig.value.timeZone;
              state.userData.timezone = datetimeConfig.value.timeZone;
            }
          }
        }
      })
      .addCase(getOpenPaasUserDataAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(getOpenPaasUserDataAsync.rejected, (state, action) => {
        if (action.payload?.status !== 401) {
          state.loading = false;
          state.error =
            action.payload?.message || "Failed to fetch user information";
        }
      })
      .addCase(updateUserConfigurationsAsync.fulfilled, (state, action) => {
        if (action.payload.language !== undefined) {
          state.language = action.payload.language;
          if (state.userData) {
            state.userData.language = action.payload.language;
          }
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
export const { setUserData, setTokens, setLanguage, setTimezone, clearError } =
  userSlice.actions;

export default userSlice.reducer;
