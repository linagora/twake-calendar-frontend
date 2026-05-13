import { makeSeriesJCal } from '@/features/Events/transformers/makeSeriesJCal'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { toRejectedError } from '@/utils/errorUtils'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { Calendar } from '../CalendarTypes'
import { RejectedError } from '../types/RejectedError'
import { fetchAllRecurrentVevents, putEvent } from '@/features/Events/EventDao'

export const updateSeriesAsync = createAsyncThunk<
  void,
  { cal: Calendar; event: CalendarEvent; removeOverrides?: boolean },
  { rejectValue: RejectedError }
>(
  'calendars/updateSeries',
  async ({ cal, event, removeOverrides = true }, { rejectWithValue }) => {
    try {
      const vevents = await fetchAllRecurrentVevents(event)
      const jCal = makeSeriesJCal(
        vevents,
        event,
        cal.owner?.emails?.[0],
        removeOverrides
      )

      await putEvent(event, jCal)
    } catch (err) {
      return rejectWithValue(toRejectedError(err))
    }
  }
)
