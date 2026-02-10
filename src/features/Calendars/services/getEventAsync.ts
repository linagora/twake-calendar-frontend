import { getEvent } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { RejectedError } from "../types/RejectedError";

export const getEventAsync = createAsyncThunk<
  { calId: string; event: CalendarEvent },
  CalendarEvent,
  { rejectValue: RejectedError }
>("calendars/getEvent", async (event, { rejectWithValue }) => {
  try {
    const response: CalendarEvent = await getEvent(event);
    return {
      calId: event.calId,
      event: response,
    };
  } catch (err) {
    const error = err as { response?: { status?: number } };
    return rejectWithValue({
      message: formatReduxError(err),
      status: error.response?.status,
    });
  }
});
