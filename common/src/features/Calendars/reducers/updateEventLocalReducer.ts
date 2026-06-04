import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarEvent } from '../../Events/EventsTypes'
import { CalendarState } from '../CalendarSlice'

export const updateEventLocalReducer = (
  create: ReducerCreators<CalendarState>
) =>
  create.reducer(
    (
      state: CalendarState,
      action: PayloadAction<{ calId: string; event: CalendarEvent }>
    ) => {
      const { calId, event } = action.payload
      if (state.list[calId]) {
        state.list[calId].events[event.uid] = event
      }
    }
  )
