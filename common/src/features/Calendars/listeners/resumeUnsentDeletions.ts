import type { AppDispatch, RootState } from '@common/app/store'
import { resumeUnsentDeletions } from '@common/features/Events/eventDeletion'
import { createListenerMiddleware } from '@reduxjs/toolkit'
import { getCalendarsList } from '../CalendarSlice'

export const resumeUnsentDeletionsMiddleware = createListenerMiddleware()

const startListening = resumeUnsentDeletionsMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>()

// A deletion needs its calendar: send the unsent ones once calendars are known
startListening({
  actionCreator: getCalendarsList.fulfilled,
  effect: (_, listenerApi) => {
    void listenerApi.dispatch(resumeUnsentDeletions())
  }
})
