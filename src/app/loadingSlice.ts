import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LoadingState {
  isLoading: boolean;
  message?: string;
}

const initialState: LoadingState = {
  isLoading: false,
  message: undefined,
};

const loadingSlice = createSlice({
  name: "loading",
  initialState,
  reducers: {
    setAppLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (!action.payload) {
        state.message = undefined;
      }
    },
    setLoadingMessage: (state, action: PayloadAction<string | undefined>) => {
      state.message = action.payload;
    },
  },
});

export const { setAppLoading, setLoadingMessage } = loadingSlice.actions;
export default loadingSlice.reducer;
