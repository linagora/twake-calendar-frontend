import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { formatReduxError } from "../../utils/errorUtils";
import { searchEvent } from "../Events/EventApi";

export interface SearchResultsState {
  hits: number;
  results: Record<string, any>[];
  error: string | null;
  loading: boolean;
}

const initialState: SearchResultsState = {
  results: [],
  hits: 0,
  error: null,
  loading: false,
};

export const searchEventsAsync = createAsyncThunk<
  { hits: number; events: Record<string, any>[] },
  { search: string; filters: any },
  { rejectValue: { message: string; status?: number } }
>("events/searchEvents", async ({ search, filters }, { rejectWithValue }) => {
  try {
    const response = (await searchEvent(search, filters)) as Record<
      string,
      any
    >;

    return {
      hits: Number(response._total_hits),
      events: response._embedded?.events ?? [],
    };
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});

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
  extraReducers: (builder) => {
    builder
      .addCase(searchEventsAsync.pending, (state) => {
        state.loading = true;
        state.error = null; // reset error on new search
      })
      .addCase(searchEventsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.hits = action.payload.hits;
        state.results = action.payload.events;
      })
      .addCase(searchEventsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Unknown error occurred";
      });
  },
});

export const { setResults, setHits } = searchResultsSlice.actions;
export default searchResultsSlice.reducer;
