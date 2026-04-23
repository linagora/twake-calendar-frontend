import type { AppDispatch, RootState } from '@/app/store'
import { findCalendarById, getDisplayedCalendarRange } from '@/utils'
import { createListenerMiddleware } from '@reduxjs/toolkit'
import {
  deleteEventAsync,
  deleteEventInstanceAsync,
  moveEventAsync,
  putEventAsync,
  refreshCalendarWithSyncToken,
  updateEventInstanceAsync,
  updateSeriesAsync
} from '../services'

export const postMutationRefreshMiddleware = createListenerMiddleware()

const startListening =
  postMutationRefreshMiddleware.startListening.withTypes<RootState, AppDispatch>()

function triggerRefresh(
  dispatch: AppDispatch,
  getState: () => RootState,
  calId: string
) {
  const found = findCalendarById(getState(), calId)
  if (!found) return
  dispatch(
    refreshCalendarWithSyncToken({
      calendar: found.calendar,
      calType: found.type,
      calendarRange: getDisplayedCalendarRange()
    })
  )
}

startListening({
  actionCreator: putEventAsync.fulfilled,
  effect: (action, { dispatch, getState }) => {
    triggerRefresh(dispatch, getState, action.payload.calId)
  }
})

startListening({
  actionCreator: deleteEventAsync.fulfilled,
  effect: (action, { dispatch, getState }) => {
    triggerRefresh(dispatch, getState, action.payload.calId)
  }
})

startListening({
  actionCreator: deleteEventInstanceAsync.fulfilled,
  effect: (action, { dispatch, getState }) => {
    triggerRefresh(dispatch, getState, action.payload.calId)
  }
})

startListening({
  actionCreator: updateEventInstanceAsync.fulfilled,
  effect: (action, { dispatch, getState }) => {
    triggerRefresh(dispatch, getState, action.payload.calId)
  }
})

startListening({
  actionCreator: moveEventAsync.fulfilled,
  effect: (action, { dispatch, getState }) => {
    triggerRefresh(dispatch, getState, action.payload.calId)
    const sourceCalId = action.meta.arg.newEvent.calId
    if (sourceCalId && sourceCalId !== action.payload.calId) {
      triggerRefresh(dispatch, getState, sourceCalId)
    }
  }
})

startListening({
  actionCreator: updateSeriesAsync.fulfilled,
  effect: (action, { dispatch, getState }) => {
    triggerRefresh(dispatch, getState, action.meta.arg.cal.id)
  }
})
