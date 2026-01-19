import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getEvent } from "../../Events/EventApi";
import { CalendarEvent } from "../../Events/EventsTypes";
import { RejectedError } from "../CalendarSlice";

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
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});
