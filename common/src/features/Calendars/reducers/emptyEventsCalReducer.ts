import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const emptyEventsCalReducer = (create: ReducerCreators<CalendarState>) =>
  create.reducer(
    (
      state: CalendarState,
      action: PayloadAction<{ calId?: string; calType?: 'temp' }>
    ) => {
      const cals =
        action.payload.calType === 'temp' ? state.templist : state.list
      if (action.payload.calId) {
        cals[action.payload.calId].events = {}
      } else {
        Object.keys(state.templist).forEach(calId => (cals[calId].events = {}))
      }
    }
  )
