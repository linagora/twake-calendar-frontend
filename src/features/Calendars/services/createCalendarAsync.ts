import { OpenPaasUserData } from "@/features/User/type/OpenPaasUserData";
import { userData } from "@/features/User/userDataTypes";
import { toRejectedError } from "@/utils/errorUtils";
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
    owner: OpenPaasUserData;
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

      return {
        userId: userData.openpaasId,
        calId,
        color,
        name,
        desc,
        owner: { ...userData, emails: userData.email ? [userData.email] : [] },
      };
    } catch (err) {
      return rejectWithValue(toRejectedError(err));
    }
  }
);
