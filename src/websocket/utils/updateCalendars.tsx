import { AppDispatch, RootState, store } from "../../app/store";
import { refreshCalendarWithSyncToken } from "../../features/Calendars/services/refreshCalendar";
import { getDisplayedCalendarRange } from "../../utils/CalendarRangeManager";
import { findCalendarById } from "../../utils/findCalendarById";
import { parseMessage } from "../ws/parseMessage";
import { parseCalendarPath } from "./parseCalendarPath";

export function updateCalendars(
  message: unknown,
  dispatch: AppDispatch,
  state: RootState
) {
  const currentRange = getDisplayedCalendarRange();
  const calendarsToRefresh = parseMessage(message);
  calendarsToRefresh.forEach((calendarPath) => {
    const calendarId = parseCalendarPath(calendarPath) ?? "";
    const calendar = findCalendarById(state, calendarId);
    if (calendar) {
      dispatch(
        refreshCalendarWithSyncToken({
          calendar: calendar.calendar,
          calType: calendar.type,
          calendarRange: currentRange,
        })
      );
    }
  });
}
