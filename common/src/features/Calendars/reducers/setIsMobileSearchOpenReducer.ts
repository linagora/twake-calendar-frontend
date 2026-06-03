import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const setIsMobileSearchOpenReducer = (
  create: ReducerCreators<CalendarState>
) =>
  create.reducer((state: CalendarState, action: PayloadAction<boolean>) => {
    state.isMobileSearchOpen = action.payload
  })
