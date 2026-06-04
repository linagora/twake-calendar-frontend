import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const removeEventReducer = (create: ReducerCreators<CalendarState>) =>
  create.reducer(
    (
      state: CalendarState,
      action: PayloadAction<{ calendarUid: string; eventUid: string }>
    ) => {
      const { calendarUid, eventUid } = action.payload
      delete state.list?.[calendarUid]?.events?.[eventUid]
    }
  )
