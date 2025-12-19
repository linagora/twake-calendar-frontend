import { createAsyncThunk } from "@reduxjs/toolkit";
import { formatReduxError } from "../../../utils/errorUtils";
import { fetchSyncTokenChanges } from "../api/fetchSyncTokenChanges";
import { RejectedError } from "../CalendarSlice";
import { Calendars } from "../CalendarTypes";

export const refreshCalendarWithSyncToken = createAsyncThunk<
  void,
  {
    calendar: Calendars;
  },
  { rejectValue: RejectedError }
>("calendars/getCalendarDetails", async ({ calendar }, { rejectWithValue }) => {
  try {
    if (!calendar?.syncToken) return;
    const updates = (await fetchSyncTokenChanges(calendar.syncToken)) as Record<
      string,
      any
    >;

    console.log(updates);
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});
