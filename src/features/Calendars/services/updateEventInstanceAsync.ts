import { fetchAllRecurrentVevents, putEvent } from '@/features/Events/EventDao'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { makeEventWithOverrides } from '@/features/Events/transformers/makeEventWithOverrides'
import { toRejectedError } from '@/utils/errorUtils'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { Calendar } from '../CalendarTypes'
import { RejectedError } from '../types/RejectedError'

export const updateEventInstanceAsync = createAsyncThunk<
  { calId: string; event: CalendarEvent },
  { cal: Calendar; event: CalendarEvent },
  { rejectValue: RejectedError }
>(
  'calendars/updateEventInstance',
  async ({ cal, event }, { rejectWithValue }) => {
    try {
      const vevents = await fetchAllRecurrentVevents(event)
      const jCal = makeEventWithOverrides(
        event,
        vevents,
        cal.owner?.emails?.[0]
      )
      putEvent(event, jCal)

      return { calId: cal.id, event }
    } catch (err) {
      return rejectWithValue(toRejectedError(err))
    }
  }
)
