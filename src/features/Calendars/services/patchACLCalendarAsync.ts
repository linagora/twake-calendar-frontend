import { toRejectedError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { updateAclCalendar } from "../CalendarApi";
import { RejectedError } from "../types/RejectedError";

export const patchACLCalendarAsync = createAsyncThunk<
  {
    calId: string;
    calLink: string;
    request: string;
  },
  {
    calId: string;
    calLink: string;
    request: string;
  },
  { rejectValue: RejectedError }
>(
  "calendars/requestACLCalendar",
  async ({ calId, calLink, request }, { rejectWithValue }) => {
    try {
      await updateAclCalendar(calLink, request);
      return {
        calId,
        calLink,
        request,
      };
    } catch (err) {
      return rejectWithValue(toRejectedError(err));
    }
  }
);
