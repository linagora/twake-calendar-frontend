import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const removeEventReducer = (create: ReducerCreators<CalendarState>) =>
  create.reducer(
    (
      state: CalendarState,
      action: PayloadAction<{ calendarUid: string; eventUid: string }>
    ) => {
      delete state.list[action.payload.calendarUid].events[
        action.payload.eventUid
      ]
    }
  )
