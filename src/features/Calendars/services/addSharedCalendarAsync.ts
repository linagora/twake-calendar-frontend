import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getUserDetails } from "@/features/User/userAPI";
import { addSharedCalendar } from "../CalendarApi";
import { RejectedError } from "../CalendarSlice";

export const addSharedCalendarAsync = createAsyncThunk<
  {
    calId: string;
    color: Record<string, string>;
    link: string;
    name: string;
    desc: string;
    owner: string;
    ownerEmails: string[];
  },
  { userId: string; calId: string; cal: Record<string, any> },
  { rejectValue: RejectedError }
>(
  "calendars/addSharedCalendar",
  async ({ userId, calId, cal }, { rejectWithValue }) => {
    try {
      await addSharedCalendar(userId, calId, cal);
      const ownerData: any = await getUserDetails(
        cal.cal._links.self.href
          .replace("/calendars/", "")
          .replace(".json", "")
          .split("/")[0]
      );

      return {
        calId: cal.cal._links.self.href
          .replace("/calendars/", "")
          .replace(".json", ""),
        color: cal.color,
        link: `/calendars/${userId}/${calId}.json`,
        desc: cal.cal["caldav:description"],
        name:
          ownerData.id !== userId && cal.cal["dav:name"] === "#default"
            ? `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${
                ownerData.lastname
              }` + "'s calendar"
            : cal.cal["dav:name"],
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
