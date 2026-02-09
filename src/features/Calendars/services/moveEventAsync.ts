import { moveEvent } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { Calendar } from "../CalendarTypes";
import { RejectedError } from "../types/RejectedError";

export const moveEventAsync = createAsyncThunk<
  { calId: string },
  { cal: Calendar; newEvent: CalendarEvent; newURL: string },
  { rejectValue: RejectedError }
>(
  "calendars/moveEvent",
  async ({ cal, newEvent, newURL }, { rejectWithValue }) => {
    try {
      await moveEvent(newEvent, newURL);

      return {
        calId: cal.id,
      };
    } catch (err) {
      const error = err as { response?: { status?: number } };
      return rejectWithValue({
        message: formatReduxError(err),
        status: error.response?.status,
      });
    }
  }
);
