import type { AppDispatch, RootState } from '@common/app/store'
import { findCalendarById, getDisplayedCalendarRange } from '@common/utils'
import { createListenerMiddleware } from '@reduxjs/toolkit'
import {
  deleteEvent,
  deleteEventInstance,
  moveEvent,
  putEvent,
  refreshCalendarWithSyncToken,
  updateEventInstance,
  updateSeries
} from '../CalendarSlice'

export const postMutationRefreshMiddleware = createListenerMiddleware()

const startListening = postMutationRefreshMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>()

function triggerRefresh(
  dispatch: AppDispatch,
  getState: () => RootState,
  calId: string
): void {
  const found = findCalendarById(getState(), calId)
  if (!found) return
  void dispatch(
    refreshCalendarWithSyncToken({
      calendar: found.calendar,
      calType: found.type,
      calendarRange: getDisplayedCalendarRange()
    })
  )
}

startListening({
  actionCreator: putEvent.fulfilled,
  effect: (action, listenerApi) => {
    triggerRefresh(
      listenerApi.dispatch,
      () => listenerApi.getState(),
      action.payload.calId
    )
  }
})

startListening({
  actionCreator: deleteEvent.fulfilled,
  effect: (action, listenerApi) => {
    triggerRefresh(
      listenerApi.dispatch,
      () => listenerApi.getState(),
      action.payload.calId
    )
  }
})

startListening({
  actionCreator: deleteEventInstance.fulfilled,
  effect: (action, listenerApi) => {
    triggerRefresh(
      listenerApi.dispatch,
      () => listenerApi.getState(),
      action.payload.calId
    )
  }
})

startListening({
  actionCreator: updateEventInstance.fulfilled,
  effect: (action, listenerApi) => {
    triggerRefresh(
      listenerApi.dispatch,
      () => listenerApi.getState(),
      action.payload.calId
    )
  }
})

startListening({
  actionCreator: moveEvent.fulfilled,
  effect: (action, listenerApi) => {
    triggerRefresh(
      listenerApi.dispatch,
      () => listenerApi.getState(),
      action.payload.calId
    )
    const sourceCalId = action.meta.arg.newEvent.calId
    if (sourceCalId && sourceCalId !== action.payload.calId) {
      triggerRefresh(
        listenerApi.dispatch,
        () => listenerApi.getState(),
        sourceCalId
      )
    }
  }
})

startListening({
  actionCreator: updateSeries.fulfilled,
  effect: (action, listenerApi) => {
    triggerRefresh(
      listenerApi.dispatch,
      () => listenerApi.getState(),
      action.meta.arg.cal.id
    )
  }
})
