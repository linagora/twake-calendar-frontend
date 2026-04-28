import { formatReduxError } from '@/utils/errorUtils'
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { searchEvent } from '../Events/EventApi'
import { userAttendee } from '../User/models/attendee'
import { SearchEventResult } from './types/SearchEventResult'

export interface SearchFilters {
  searchIn: string
  keywords: string
  organizers: userAttendee[]
  attendees: userAttendee[]
}

export interface SearchParams {
  search: string
  filters: SearchFilters
}

export interface SearchResultsState {
  searchParams: SearchParams
  hits: number
  results: SearchEventResult[]
  error: string | null
  loading: boolean
}

export const defaultSearchParams: SearchParams = {
  search: '',
  filters: {
    searchIn: 'my-calendars',
    keywords: '',
    organizers: [],
    attendees: []
  }
}

export const searchEventsAsync = createAsyncThunk<
  { hits: number; events: SearchEventResult[] },
  {
    search: string
    filters: {
      searchIn: string[]
      keywords: string
      organizers: string[]
      attendees: string[]
    }
  },
  { rejectValue: { message: string; status?: number } }
>('events/searchEvents', async ({ search, filters }, { rejectWithValue }) => {
  try {
    const response = await searchEvent(search, filters)

    return {
      hits: Number(response._total_hits),
      events: (response._embedded?.events ?? []) as SearchEventResult[]
    }
  } catch (err) {
    const error = err as { response?: { status?: number } }
    return rejectWithValue({
      message: formatReduxError(err),
      status: error.response?.status
    })
  }
})

const initialState: SearchResultsState = {
  searchParams: defaultSearchParams,
  hits: 0,
  results: [],
  error: null,
  loading: false
}

export const searchResultsSlice = createSlice({
  name: 'searchResult',
  initialState,
  reducers: {
    setResults: (state, action: PayloadAction<SearchEventResult[]>) => {
      state.results = action.payload
    },
    setHits: (state, action: PayloadAction<number>) => {
      state.hits = action.payload
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchParams.search = action.payload
    },
    setFilters: (state, action: PayloadAction<Partial<SearchFilters>>) => {
      state.searchParams.filters = {
        ...state.searchParams.filters,
        ...action.payload
      }
    },
    clearFilters: state => {
      state.searchParams.filters = defaultSearchParams.filters
    },
    clearSearch: state => {
      state.searchParams = defaultSearchParams
      state.results = []
      state.hits = 0
      state.error = null
    }
  },
  extraReducers: builder => {
    builder
      .addCase(searchEventsAsync.pending, state => {
        state.loading = true
        state.error = null // reset error on new search
      })
      .addCase(searchEventsAsync.fulfilled, (state, action) => {
        state.loading = false
        state.hits = action.payload.hits
        state.results = action.payload.events
      })
      .addCase(searchEventsAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.message || 'Unknown error occurred'
      })
  }
})

export const {
  setResults,
  setHits,
  setFilters,
  setSearchQuery,
  clearFilters,
  clearSearch
} = searchResultsSlice.actions
export default searchResultsSlice.reducer
