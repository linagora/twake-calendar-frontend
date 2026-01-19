import { updateSeries } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { RejectedError } from "../CalendarSlice";
import { Calendar } from "../CalendarTypes";

export const updateSeriesAsync = createAsyncThunk<
  void,
  { cal: Calendar; event: CalendarEvent; removeOverrides?: boolean },
  { rejectValue: RejectedError }
>(
  "calendars/updateSeries",
  async ({ cal, event, removeOverrides = true }, { rejectWithValue }) => {
    try {
      await updateSeries(event, cal.ownerEmails?.[0] ?? "", removeOverrides);
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
