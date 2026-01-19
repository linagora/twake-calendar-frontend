import { formatReduxError } from "@/utils/errorUtils";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { moveEvent } from "../../Events/EventApi";
import { CalendarEvent } from "../../Events/EventsTypes";
import { RejectedError } from "../CalendarSlice";
import { Calendar } from "../CalendarTypes";

export const moveEventAsync = createAsyncThunk<
  { calId: string; events: CalendarEvent[] },
  { cal: Calendar; newEvent: CalendarEvent; newURL: string },
  { rejectValue: RejectedError }
>(
  "calendars/moveEvent",
  async ({ cal, newEvent, newURL }, { rejectWithValue }) => {
    try {
      await moveEvent(newEvent, newURL);

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
          return vevents.map((vevent: any[]) => {
            return parseCalendarEvent(
              vevent[1],
              cal.color ?? {},
              cal.id,
              eventURL
            );
          });
        }
      );

      return {
        calId: cal.id,
        events,
      };
    } catch (err: any) {
      return rejectWithValue({
        message: formatReduxError(err),
        status: err.response?.status,
      });
    }
  }
);
