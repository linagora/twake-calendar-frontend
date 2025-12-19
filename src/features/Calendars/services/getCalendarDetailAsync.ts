import { createAsyncThunk } from "@reduxjs/toolkit";
import { CalendarEvent } from "../../Events/EventsTypes";
import { getCalendar } from "../CalendarApi";
import { parseCalendarEvent } from "../../Events/eventUtils";
import { formatReduxError } from "../../../utils/errorUtils";
import { RejectedError } from "../CalendarSlice";

export const getCalendarDetailAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[]; calType?: string },
  {
    calId: string;
    match: { start: string; end: string };
    calType?: string;
    signal?: AbortSignal;
  },
  { rejectValue: RejectedError }
>(
  "calendars/getCalendarDetails",
  async ({ calId, match, calType, signal }, { rejectWithValue }) => {
    try {
      const calendar = (await getCalendar(calId, match, signal)) as Record<
        string,
        any
      >;
      const color = calendar["apple:color"];
      const syncToken = calendar._embedded["sync-token"];
      const events: CalendarEvent[] = calendar._embedded["dav:item"].flatMap(
        (eventdata: any) => {
          const vevents = eventdata.data[2] as any[][];
          const valarm = eventdata.data[2][0][2][0];
          const eventURL = eventdata._links.self.href;
          return vevents.map((vevent: any[]) => {
            return parseCalendarEvent(
              vevent[1],
              color,
              calId,
              eventURL,
              valarm
            );
          });
        }
      );
      return { calId, events, calType, syncToken };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
