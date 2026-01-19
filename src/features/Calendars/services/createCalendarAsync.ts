import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getUserDetails } from "../../User/userAPI";
import { postCalendar } from "../CalendarApi";
import { RejectedError } from "../CalendarSlice";

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
    userId: string;
    calId: string;
    color: Record<string, string>;
    name: string;
    desc: string;
  },
  { rejectValue: RejectedError }
>(
  "calendars/createCalendar",
  async ({ userId, calId, color, name, desc }, { rejectWithValue }) => {
    try {
      await postCalendar(userId, calId, color, name, desc);
      const ownerData: any = await getUserDetails(userId.split("/")[0]);

      return {
        userId,
        calId,
        color,
        name,
        desc,
        owner: `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${
          ownerData.lastname
        }`,
        ownerEmails: ownerData.emails,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
