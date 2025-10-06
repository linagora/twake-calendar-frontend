import { ThunkDispatch } from "@reduxjs/toolkit";
import {
  getCalendarsListAsync,
  getCalendarDetailAsync,
} from "../../../features/Calendars/CalendarSlice";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../utils/dateUtils";

export async function refreshCalendars(
  dispatch: ThunkDispatch<any, any, any>,
  calendars: Calendars[],
  calendarRange: { start: Date; end: Date }
) {
  await dispatch(getCalendarsListAsync());

  calendars.map(
    async (cal) =>
      await dispatch(
        getCalendarDetailAsync({
          calId: cal.id,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
          },
        })
      )
  );
}
