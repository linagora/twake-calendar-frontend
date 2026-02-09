import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { removeCalendar } from "../CalendarApi";
import { RejectedError } from "../types/RejectedError";

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
