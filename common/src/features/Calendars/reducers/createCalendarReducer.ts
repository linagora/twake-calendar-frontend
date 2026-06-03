import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarState } from '../CalendarSlice'

export const createCalendarReducer = (create: ReducerCreators<CalendarState>) =>
  create.reducer(
    (
      state: CalendarState,
      action: PayloadAction<Record<string, string | Record<string, string>>>
    ) => {
      const id = Date.now().toString(36)
      state.list[id] = {} as Calendar
      state.list[id].name = action.payload.name as string
      state.list[id].color = action.payload.color as Record<string, string>
      state.list[id].description = action.payload.description as string
      state.list[id].events = {}
    }
  )
