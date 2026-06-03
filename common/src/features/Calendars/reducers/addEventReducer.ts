import { PayloadAction, ReducerCreators } from '@reduxjs/toolkit'
import { CalendarEvent } from '@common/types/EventsTypes'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { CalendarState } from '../CalendarSlice'

export const addEventReducer = (create: ReducerCreators<CalendarState>) =>
  create.reducer(
    (
      state: CalendarState,
      action: PayloadAction<{ calendarUid: string; event: CalendarEvent }>
    ) => {
      if (!state.list[action.payload.calendarUid].events) {
        state.list[action.payload.calendarUid].events = {}
      }
      state.list[action.payload.calendarUid].events[action.payload.event.uid] =
        action.payload.event
      state.list[action.payload.calendarUid].events[
        action.payload.event.uid
      ].URL = `/calendars/${action.payload.calendarUid}/${extractEventBaseUuid(
        action.payload.event.uid
      )}.ics`
    }
  )
