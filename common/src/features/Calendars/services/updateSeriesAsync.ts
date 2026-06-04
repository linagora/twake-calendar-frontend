import { RejectedError } from '@common/features/Calendars/types/RejectedError'
import {
  fetchAllRecurrentVevents,
  putEvent
} from '@common/features/Events/EventDao'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { toRejectedError } from '@common/utils/errorUtils'
import { ReducerCreators } from '@reduxjs/toolkit'
import { CalendarState } from '../CalendarSlice'

export const updateSeriesThunk = (create: ReducerCreators<CalendarState>) =>
  create.asyncThunk<
    void,
    {
      cal: Calendar
      event: CalendarEvent
      removeOverrides?: boolean
      sourceRecurrenceId?: string
    },
    { rejectValue: RejectedError }
  >(
    async (
      { cal, event, removeOverrides = true, sourceRecurrenceId },
      { rejectWithValue }
    ) => {
      try {
        const vevents = await fetchAllRecurrentVevents(event)
        const jCal = makeSeriesJCal(vevents, event, {
          calOwnerEmail: cal.owner?.emails?.[0],
          removeOverrides,
          sourceRecurrenceId
        })

        await putEvent(event, jCal)
      } catch (err) {
        return rejectWithValue(toRejectedError(err))
      }
    },
    {
      pending: state => {
        state.pending = true
      },
      fulfilled: state => {
        state.pending = false
        state.error = null
      },
      rejected: (state, action) => {
        state.pending = false
        state.error =
          action.payload?.message ||
          action.error.message ||
          'Failed to update event series'
      }
    }
  )
