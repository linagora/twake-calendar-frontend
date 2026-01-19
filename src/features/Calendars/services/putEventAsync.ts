import { putEvent } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { parseCalendarEvent } from "@/features/Events/eventUtils";
import {
  computeWeekRange,
  formatDateToYYYYMMDDTHHMMSS,
} from "@/utils/dateUtils";
import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getCalendar } from "../CalendarApi";
import { RejectedError } from "../CalendarSlice";
import { Calendar } from "../CalendarTypes";

export const putEventAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[]; calType?: "temp" },
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
      const eventDate = new Date(newEvent.start);

      const { start: weekStart, end: weekEnd } = computeWeekRange(eventDate);

      const calEvents = (await getCalendar(cal.id, {
        start: formatDateToYYYYMMDDTHHMMSS(weekStart),
        end: formatDateToYYYYMMDDTHHMMSS(weekEnd),
      })) as Record<string, any>;
      const events: CalendarEvent[] = calEvents._embedded["dav:item"].flatMap(
        (eventdata: any) => {
          const vevents = eventdata.data[2] as any[][];
          const eventURL = eventdata._links.self.href;
          const valarm = eventdata.data[2][0][2][0];
          return vevents.map((vevent: any[]) => {
            return parseCalendarEvent(
              vevent[1],
              cal.color ?? {},
              cal.id,
              eventURL,
              valarm
            );
          });
        }
      );

      return {
        calId: cal.id,
        events,
        calType,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
