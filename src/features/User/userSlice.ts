import { createSlice } from "@reduxjs/toolkit";
import { userData } from "./userDataTypes";

export const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null as unknown as userData,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setUserData } = userSlice.actions;

export default userSlice.reducer;
