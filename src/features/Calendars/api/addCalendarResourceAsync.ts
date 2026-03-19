import { OpenPaasUserData } from "@/features/User/type/OpenPaasUserData";
import { getResourceDetails, getUserDetails } from "@/features/User/userAPI";
import { toRejectedError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { addSharedCalendar } from "../CalendarApi";
import { CalendarInput } from "../types/CalendarData";
import { RejectedError } from "../types/RejectedError";
import { User } from "@/components/Attendees/PeopleSearch";

export const addCalendarResourceAsync = createAsyncThunk<
  {
    calId: string;
    color: Record<string, string>;
    link: string;
    name: string;
    desc: string;
    owner: OpenPaasUserData;
  },
  {
    userId: string;
    calId: string;
    cal: Omit<CalendarInput, "owner"> & {
      owner?: Omit<User, "email"> & { email?: string };
    };
  },
  { rejectValue: RejectedError }
>(
  "calendars/addCalendarResource",
  async ({ userId, calId, cal }, { rejectWithValue }) => {
    const resourceId = cal.cal._links.self?.href
      ?.replace("/calendars/", "")
      ?.replace(".json", "")
      ?.split("/")[0];

    let owner: OpenPaasUserData = {
      firstname: "",
      lastname: cal.cal["dav:name"] ?? "",
      emails: [],
      resource: true,
    };
    try {
      await addSharedCalendar(userId, calId, cal);

      if (resourceId) {
        try {
          const resource = await getResourceDetails(resourceId);
          owner = {
            ...(await getUserDetails(resource.creator)),
            resource: true,
          };
        } catch (e) {
          toRejectedError(e);
        }
      }

      return {
        calId: cal.cal._links.self?.href
          ?.replace("/calendars/", "")
          .replace(".json", ""),
        color: cal.color,
        link: `/calendars/${userId}/${calId}.json`,
        desc: cal.cal["caldav:description"] ?? "",
        name: cal.cal["dav:name"] ?? "",
        owner,
      };
    } catch (err) {
      return rejectWithValue(toRejectedError(err));
    }
  }
);
