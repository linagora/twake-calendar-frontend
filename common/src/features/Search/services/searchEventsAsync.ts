import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { searchEvent } from '../../Events/EventDao'
import { makeSearchEventParam } from '../../Events/transformers/makeSearchEventParam'
import { SearchResultsState } from '../SearchSlice'
import { SearchEventResult } from '../types/SearchEventResult'

export interface SearchFiltersInput {
  searchIn: string[]
  keywords: string
  organizers: string[]
  attendees: string[]
}

export const searchEventsThunk = (
  create: ReducerCreators<SearchResultsState>
) =>
  create.asyncThunk<
    { hits: number; events: SearchEventResult[] },
    { search: string; filters: SearchFiltersInput },
    { rejectValue: { message: string; status?: number } }
  >(
    async ({ search, filters }, { rejectWithValue }) => {
      try {
        const searchParams = makeSearchEventParam(search, filters)
        const response = await searchEvent(searchParams)

        return {
          hits: Number(response._total_hits),
          events: (response._embedded?.events ?? []) as SearchEventResult[]
        }
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.loading = true
        state.error = null // reset error on new search
      },
      fulfilled: (state, action) => {
        state.loading = false
        state.hits = action.payload.hits
        state.results = action.payload.events
      },
      rejected: (state, action) => {
        state.loading = false
        state.error = action.payload?.message || 'Unknown error occurred'
      }
    }
  )
