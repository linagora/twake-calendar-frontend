import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { userData, userOrganiser } from "./userDataTypes";
import { getOpenPaasUser } from "./userAPI";
import { formatReduxError } from "../../utils/errorUtils";

export const getOpenPaasUserDataAsync = createAsyncThunk<
  Record<string, string>,
  void,
  { rejectValue: { message: string; status?: number } }
>("user/getOpenPaasUserData", async (_, { rejectWithValue }) => {
  try {
    const user = (await getOpenPaasUser()) as Record<string, string>;
    return user;
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
      });
  },
});

// Action creators are generated for each case reducer function
export const { setUserData, setTokens, clearError } = userSlice.actions;

export default userSlice.reducer;
