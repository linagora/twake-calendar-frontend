import { CalendarState } from '../CalendarSlice'
import { ReducerCreators } from '@reduxjs/toolkit'

export const clearErrorReducer = (create: ReducerCreators<CalendarState>) =>
  create.reducer((state: CalendarState) => {
    state.error = null
  })
