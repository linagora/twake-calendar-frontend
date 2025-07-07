import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { userData, userOrganiser } from "./userDataTypes";
import getOpenPaasUserId from "./userAPI";

export const getOpenPaasUserIdAsync = createAsyncThunk<
  string, // Return type
  string // Arg type
>("user/getOpenPaasUserId", async (access_token) => {
  const user = await getOpenPaasUserId(access_token);

  return user.id;
});

export const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null as unknown as userData,
    organiserData: null as unknown as userOrganiser,
    tokens: null as unknown as Record<string, string>,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      if (!state.organiserData) {
        state.organiserData = {} as userOrganiser;
      }
      state.organiserData.cn = action.payload.sub;
      state.organiserData.cal_address = `mailto:${action.payload.email}`;
    },
    setTokens: (state, action) => {
      state.tokens = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getOpenPaasUserIdAsync.fulfilled, (state, action) => {
      state.userData.openpaasId = action.payload;
    });
  },
});

// Action creators are generated for each case reducer function
export const { setUserData, setTokens } = userSlice.actions;

export default userSlice.reducer;
