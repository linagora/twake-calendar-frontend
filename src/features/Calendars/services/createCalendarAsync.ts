import { userData } from "@/features/User/userDataTypes";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { postCalendar } from "../CalendarApi";
import { RejectedError } from "../types/RejectedError";

export const createCalendarAsync = createAsyncThunk<
  {
    userId: string;
    calId: string;
    color: Record<string, string>;
    name: string;
    desc: string;
    owner: string;
    ownerEmails: string[];
  },
  {
    userData: userData;
    calId: string;
    color: Record<string, string>;
    name: string;
    desc: string;
  },
  { rejectValue: RejectedError }
>(
  "calendars/createCalendar",
  async ({ userData, calId, color, name, desc }, { rejectWithValue }) => {
    try {
      if (!userData.openpaasId) {
        throw new Error("No openpaasId");
      }

      await postCalendar(userData.openpaasId, calId, color, name, desc);
      const owner = [userData.given_name, userData.family_name]
        .filter(Boolean)
        .join(" ");

      return {
        userId: userData.openpaasId,
        calId,
        color,
        name,
        desc,
        owner,
        ownerEmails: userData.email ? [userData.email] : [],
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
