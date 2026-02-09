import { CalendarEvent } from "@/features/Events/EventsTypes";
import {
  CalendarData,
  CalendarItem,
} from "@/features/Calendars/types/CalendarData";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getCalendar } from "../CalendarApi";
import { RejectedError } from "../types/RejectedError";
import { extractCalendarEvents } from "../utils/extractCalendarEvents";
import { defaultColors } from "@/components/Calendar/utils/calendarColorsUtils";

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
      const calendar = (await getCalendar(
        calId,
        match,
        signal
      )) as CalendarData;

      const color = calendar["apple:color"]
        ? { light: calendar["apple:color"], dark: calendar["apple:color"] }
        : defaultColors[0];
      const syncToken = calendar._embedded?.["sync-token"];

      const items = calendar._embedded?.["dav:item"];
      const events: CalendarEvent[] = Array.isArray(items)
        ? items.flatMap((item: CalendarItem) =>
            extractCalendarEvents(item, { calId, color })
          )
        : [];

      return { calId, events, calType, syncToken };
    } catch (err) {
      return rejectWithValue(toRejectedError(err));
    }
  }
);
