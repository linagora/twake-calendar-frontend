import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const clearFetchCacheReducer = (
  create: ReducerCreators<CalendarState>
) =>
  create.reducer((state: CalendarState, action: PayloadAction<string>) => {
    if (!state.list[action.payload]) return
    state.list[action.payload].lastCacheCleared = Date.now()
  })
