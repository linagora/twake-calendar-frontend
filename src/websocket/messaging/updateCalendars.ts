import type { AppDispatch } from "@/app/store";
import { store } from "@/app/store";
import { refreshCalendarWithSyncToken } from "@/features/Calendars/services/refreshCalendar";
import { getDisplayedCalendarRange, findCalendarById } from "@/utils";
import { parseMessage } from "./parseMessage";
import { parseCalendarPath } from "./parseCalendarPath";

export function updateCalendars(message: unknown, dispatch: AppDispatch) {
  const currentRange = getDisplayedCalendarRange();
  const state = store.getState();
  const { calendarsToRefresh, calendarsToHide } = parseMessage(message);
  calendarsToRefresh.forEach((calendarPath) => {
    const calendarId = parseCalendarPath(calendarPath);
    if (!calendarId) {
      console.warn("Invalid calendar path received:", calendarPath);
      return;
    }
    const calendar = findCalendarById(state, calendarId);
    if (calendar) {
      dispatch(
        refreshCalendarWithSyncToken({
          calendar: calendar.calendar,
          calType: calendar.type,
          calendarRange: currentRange,
        })
      );
    } else {
      console.warn("Calendar not found for id:", calendarId);
    }
  });
}
