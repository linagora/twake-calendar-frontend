import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { userData, userOrganiser } from "./userDataTypes";
import { getOpenPaasUser } from "./userAPI";

export const getOpenPaasUserDataAsync = createAsyncThunk<any>(
  "user/getOpenPaasUserData",
  async () => {
    const user = (await getOpenPaasUser()) as Record<string, string>;

    return user;
  }
);

export const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null as unknown as userData,
    organiserData: null as unknown as userOrganiser,
    tokens: null as unknown as Record<string, string>,
    loading: true,
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
      .addCase(getOpenPaasUserDataAsync.rejected, (state) => {
        state.loading = false;
      });
  },
});

// Action creators are generated for each case reducer function
export const { setUserData, setTokens } = userSlice.actions;

export default userSlice.reducer;
