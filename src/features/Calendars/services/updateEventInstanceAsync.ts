import { putEventWithOverrides } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { RejectedError } from "../types/RejectedError";
import { Calendar } from "../CalendarTypes";

export const updateEventInstanceAsync = createAsyncThunk<
  { calId: string; event: CalendarEvent },
  { cal: Calendar; event: CalendarEvent },
  { rejectValue: RejectedError }
>(
  "calendars/updateEventInstance",
  async ({ cal, event }, { rejectWithValue }) => {
    try {
      await putEventWithOverrides(event, cal.ownerEmails?.[0]);
      return { calId: cal.id, event };
    } catch (err) {
      return rejectWithValue(toRejectedError(err));
    }
  }
);
