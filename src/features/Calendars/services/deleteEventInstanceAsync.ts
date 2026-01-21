import { deleteEventInstance } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { RejectedError } from "../types/RejectedError";
import { Calendar } from "../CalendarTypes";

export const deleteEventInstanceAsync = createAsyncThunk<
  { calId: string; eventId: string },
  { cal: Calendar; event: CalendarEvent },
  { rejectValue: RejectedError }
>("calendars/delEventInstance", async ({ cal, event }, { rejectWithValue }) => {
  try {
    await deleteEventInstance(event, cal.ownerEmails?.[0]);
    return { calId: cal.id, eventId: event.uid };
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});
