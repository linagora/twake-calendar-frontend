import { moveEvent } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { parseCalendarEvent } from "@/features/Events/eventUtils";
import {
  computeWeekRange,
  formatDateToYYYYMMDDTHHMMSS,
} from "@/utils/dateUtils";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getCalendar } from "../CalendarApi";
import { RejectedError } from "../types/RejectedError";
import { Calendar } from "../CalendarTypes";

export const moveEventAsync = createAsyncThunk<
  { calId: string },
  { cal: Calendar; newEvent: CalendarEvent; newURL: string },
  { rejectValue: RejectedError }
>(
  "calendars/moveEvent",
  async ({ cal, newEvent, newURL }, { rejectWithValue }) => {
    try {
      await moveEvent(newEvent, newURL);

      return {
        calId: cal.id,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
