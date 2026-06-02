import { PayloadAction } from '@reduxjs/toolkit'
import { userAttendee } from '@common/features/User/models/attendee'
import { SearchEventResult } from './types/SearchEventResult'
import { searchEventsThunk } from './services'
import { createAppSlice } from '@common/app/createAppSlice'

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

const SearchSlice = createAppSlice({
  name: 'searchResult',
  initialState: {
    searchParams: defaultSearchParams,
    hits: 0,
    results: [],
    error: null,
    loading: false
  } as SearchResultsState,
  reducers: create => ({
    // Regular reducers
    setResults: create.reducer(
      (state, action: PayloadAction<SearchEventResult[]>) => {
        state.results = action.payload
      }
    ),
    setHits: create.reducer((state, action: PayloadAction<number>) => {
      state.hits = action.payload
    }),
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchParams.search = action.payload
    }),
    setFilters: create.reducer(
      (state, action: PayloadAction<Partial<SearchFilters>>) => {
        state.searchParams.filters = {
          ...state.searchParams.filters,
          ...action.payload
        }
      }
    ),
    clearFilters: create.reducer(state => {
      state.searchParams.filters = defaultSearchParams.filters
    }),
    clearSearch: create.reducer(state => {
      state.searchParams = defaultSearchParams
      state.results = []
      state.hits = 0
      state.error = null
    }),
    // Thunks using create.asyncThunk
    searchEvents: searchEventsThunk(create)
  })
})

export const {
  setResults,
  setHits,
  setFilters,
  setSearchQuery,
  clearFilters,
  clearSearch,
  // Thunks
  searchEvents
} = SearchSlice.actions

export default SearchSlice.reducer
