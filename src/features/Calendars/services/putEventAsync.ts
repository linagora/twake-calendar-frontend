import { putEvent } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { toRejectedError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { Calendar } from "../CalendarTypes";
import { RejectedError } from "../types/RejectedError";

export const putEventAsync = createAsyncThunk<
  { calId: string; calType?: "temp" },
  { cal: Calendar; newEvent: CalendarEvent; calType?: "temp" },
  { rejectValue: RejectedError }
>(
  "calendars/putEvent",
  async ({ cal, newEvent, calType }, { rejectWithValue }) => {
    try {
      await putEvent(
        newEvent,
        cal.ownerEmails ? cal.ownerEmails[0] : undefined
      );

      return {
        calId: cal.id,
        calType,
      };
    } catch (err) {
      return rejectWithValue(toRejectedError(err));
    }
  }
);
