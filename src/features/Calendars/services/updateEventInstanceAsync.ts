import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { putEventWithOverrides } from "../../Events/EventApi";
import { CalendarEvent } from "../../Events/EventsTypes";
import { RejectedError } from "../CalendarSlice";
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
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
