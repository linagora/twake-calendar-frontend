import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const setIsMobileSearchOpenReducer = (
  create: ReducerCreators<CalendarState>
) =>
  create.reducer<boolean>((state, action): void => {
    state.isMobileSearchOpen = action.payload
  })
