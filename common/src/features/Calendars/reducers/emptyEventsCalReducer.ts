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
      // the sync token describes the events held: with none left, it goes too,
      // and the next load of a range sets a fresh one
      if (action.payload.calId) {
        cals[action.payload.calId].events = {}
        cals[action.payload.calId].syncToken = undefined
      } else {
        Object.keys(state.templist).forEach(calId => {
          cals[calId].events = {}
          cals[calId].syncToken = undefined
        })
      }
    }
  )
