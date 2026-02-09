import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { proppatchCalendar } from "../CalendarApi";
import { RejectedError } from "../types/RejectedError";

export const patchCalendarAsync = createAsyncThunk<
  {
    calId: string;
    calLink: string;
    patch: { name: string; desc: string; color: Record<string, string> };
  },
  {
    calId: string;
    calLink: string;
    patch: { name: string; desc: string; color: Record<string, string> };
  },
  { rejectValue: RejectedError }
>(
  "calendars/patchCalendar",
  async ({ calId, calLink, patch }, { rejectWithValue }) => {
    try {
      await proppatchCalendar(calLink, patch);
      return {
        calId,
        calLink,
        patch,
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
