import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { removeCalendar } from "../CalendarApi";
import { RejectedError } from "../CalendarSlice";

export const removeCalendarAsync = createAsyncThunk<
  {
    calId: string;
  },
  {
    calId: string;
    calLink: string;
  },
  { rejectValue: RejectedError }
>(
  "calendars/removeCalendar",
  async ({ calId, calLink }, { rejectWithValue }) => {
    try {
      await removeCalendar(calLink);
      return {
        calId,
        calLink,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
