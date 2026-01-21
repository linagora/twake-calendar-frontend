import { CalendarEvent } from "@/features/Events/EventsTypes";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getCalendar } from "../CalendarApi";
import { RejectedError } from "../types/RejectedError";
import { extractCalendarEvents } from "../utils/extractCalendarEvents";

export const getCalendarDetailAsync = createAsyncThunk<
  {
    calId: string;
    events: CalendarEvent[];
    calType?: string;
    syncToken?: string;
  },
  {
    calId: string;
    match: { start: string; end: string };
    calType?: string;
    signal?: AbortSignal;
  },
  { rejectValue: RejectedError }
>(
  "calendars/getCalendarDetails",
  async ({ calId, match, calType, signal }, { rejectWithValue }) => {
    try {
      const calendar = (await getCalendar(calId, match, signal)) as any;

      const color = calendar["apple:color"];
      const syncToken = calendar._embedded?.["sync-token"];

      const items = calendar._embedded?.["dav:item"];
      const events: CalendarEvent[] = Array.isArray(items)
        ? items.flatMap((item: any) =>
            extractCalendarEvents(item, { calId, color })
          )
        : [];

      return { calId, events, calType, syncToken };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
