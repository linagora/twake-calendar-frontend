import { User } from "@/components/Attendees/PeopleSearch";
import { getCalendarVisibility } from "@/components/Calendar/utils/calendarUtils";
import { getUserDetails } from "@/features/User/userAPI";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getCalendars } from "../CalendarApi";
import { RejectedError } from "../CalendarSlice";
import { Calendar } from "../CalendarTypes";

export const getTempCalendarsListAsync = createAsyncThunk<
  Record<string, Calendar>,
  User,
  { rejectValue: RejectedError }
>("calendars/getTempCalendars", async (tempUser, { rejectWithValue }) => {
  try {
    const importedCalendars: Record<string, Calendar> = {};

    const calendars = (await getCalendars(
      tempUser.openpaasId ?? "",
      "sharedPublic=true&"
    )) as Record<string, any>;

    const rawCalendars = calendars._embedded?.["dav:calendar"];
    if (!rawCalendars || rawCalendars.length === 0) {
      const userName = tempUser.displayName || tempUser.email || "User";
      // Format: TRANSLATION:key|param1=value1
      const encodedName = encodeURIComponent(userName);
      throw new Error(
        `TRANSLATION:calendar.userDoesNotHavePublicCalendars|name=${encodedName}`
      );
    }

    for (const cal of rawCalendars) {
      const name = cal["dav:name"];
      const description = cal["caldav:description"];
      const delegated = cal["calendarserver:delegatedsource"] ? true : false;
      const source = cal["calendarserver:source"]
        ? cal["calendarserver:source"]._links.self.href
        : cal._links.self.href;
      const link = cal._links.self.href;

      const id = source.replace("/calendars/", "").replace(".json", "");
      const visibility = getCalendarVisibility(cal["acl"]);
      const ownerData: any = await getUserDetails(id.split("/")[0]);

      importedCalendars[id] = {
        id,
        name,
        link,
        owner: `${ownerData.firstname ? `${ownerData.firstname} ` : ""}${ownerData.lastname}`,
        ownerEmails: ownerData.emails,
        description,
        delegated,
        color: {
          light: tempUser.color?.light ?? "#a8a8a8ff",
          dark: tempUser.color?.dark ?? "#a8a8a8ff",
        },
        visibility,
        events: {},
      };
    }

    return importedCalendars;
  } catch (err: any) {
    return rejectWithValue({
      message: formatReduxError(err),
      status: err.response?.status,
    });
  }
});
