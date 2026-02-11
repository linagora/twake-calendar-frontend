import { updateSeries } from "@/features/Events/api/updateSeries";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { toRejectedError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { Calendar } from "../CalendarTypes";
import { RejectedError } from "../types/RejectedError";

export const updateSeriesAsync = createAsyncThunk<
  void,
  { cal: Calendar; event: CalendarEvent; removeOverrides?: boolean },
  { rejectValue: RejectedError }
>(
  "calendars/updateSeries",
  async ({ cal, event, removeOverrides = true }, { rejectWithValue }) => {
    try {
      await updateSeries(event, cal.ownerEmails?.[0] ?? "", removeOverrides);
    } catch (err) {
      return rejectWithValue(toRejectedError(err));
    }
  }
);
