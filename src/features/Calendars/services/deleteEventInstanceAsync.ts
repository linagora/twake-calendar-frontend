import { CalendarEvent } from '@/features/Events/EventsTypes'
import { formatReduxError } from '@/utils/errorUtils'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { RejectedError } from '../types/RejectedError'
import { Calendar } from '../CalendarTypes'
import { fetchAllRecurrentVevents, putEvent } from '@/features/Events/EventDao'
import { makeDeleteEventInstanceJCal } from '@/features/Events/EventTransformers'

export const deleteEventInstanceAsync = createAsyncThunk<
  { calId: string; eventId: string },
  { cal: Calendar; event: CalendarEvent },
  { rejectValue: RejectedError }
>('calendars/delEventInstance', async ({ cal, event }, { rejectWithValue }) => {
  try {
    const vevents = await fetchAllRecurrentVevents(event)
    const newJCal = makeDeleteEventInstanceJCal(vevents, event)
    await putEvent(event, newJCal)

    return { calId: cal.id, eventId: event.uid }
  } catch (err) {
    const error = err as { response?: { status?: number } }
    return rejectWithValue({
      message: formatReduxError(err),
      status: error.response?.status
    })
  }
})
