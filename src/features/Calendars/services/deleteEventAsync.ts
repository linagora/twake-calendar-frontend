import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { deleteEvent } from "../../Events/EventApi";
import { RejectedError } from "../CalendarSlice";

export const deleteEventAsync = createAsyncThunk<
  { calId: string; eventId: string },
  { calId: string; eventId: string; eventURL: string },
  { rejectValue: RejectedError }
>(
  "calendars/delEvent",
  async ({ calId, eventId, eventURL }, { rejectWithValue }) => {
    try {
      await deleteEvent(eventURL);
      return { calId, eventId };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
