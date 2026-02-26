import { toRejectedError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { updateDelegationCalendar } from "../api/updateDelegationCalendar";
import { RejectedError } from "../types/RejectedError";

export const updateDelegationCalendarAsync = createAsyncThunk<
  {
    calId: string;
    calLink: string;
  },
  {
    calId: string;
    calLink: string;
    share: {
      set: { [x: string]: string | boolean; "dav:href": string }[];
      remove: { [x: string]: string | boolean; "dav:href": string }[];
    };
  },
  { rejectValue: RejectedError }
>(
  "calendars/patchCalendar",
  async ({ calId, calLink, share }, { rejectWithValue }) => {
    try {
      await updateDelegationCalendar(calLink, share);
      return {
        calId,
        calLink,
      };
    } catch (err) {
      return rejectWithValue(toRejectedError(err));
    }
  }
);
