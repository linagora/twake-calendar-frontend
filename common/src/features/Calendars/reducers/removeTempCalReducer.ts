import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const removeTempCalReducer = (create: ReducerCreators<CalendarState>) =>
  create.reducer((state: CalendarState, action: PayloadAction<string>) => {
    delete state.templist[action.payload]
  })
