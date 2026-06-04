import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const updateCalColorReducer = (create: ReducerCreators<CalendarState>) =>
  create.reducer(
    (
      state: CalendarState,
      action: PayloadAction<{
        id: string
        color: { light: string; dark: string }
      }>
    ) => {
      const cal = state.list[action.payload.id]
      if (cal) {
        cal.color = action.payload.color
      }
    }
  )
