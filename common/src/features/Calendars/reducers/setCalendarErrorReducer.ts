import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const setCalendarErrorReducer = (
  create: ReducerCreators<CalendarState>
) =>
  create.reducer((state: CalendarState, action: PayloadAction<string>) => {
    state.error = action.payload
  })
