import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SearchResultsState {
  hits: number;
  results: [];
}

const initialState: SearchResultsState = {
  results: [],
  hits: 0,
};

export const searchResultsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setResults: (state, action: PayloadAction<[]>) => {
      state.results = action.payload;
    },
    setHits: (state, action: PayloadAction<number>) => {
      state.hits = action.payload;
    },
  },
});

export const { setResults, setHits } = searchResultsSlice.actions;
export default searchResultsSlice.reducer;
