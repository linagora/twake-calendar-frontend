import { AppDispatch, store } from "../../app/store";
import { refreshCalendarWithSyncToken } from "../../features/Calendars/services/refreshCalendar";
import { getDisplayedDate } from "../../utils/calendarDateManager";
import { getCalendarRange } from "../../utils/dateUtils";
import { findCalendarById } from "../../utils/findCalendarById";
import { WS_OUTBOUND_EVENTS } from "../protocols";

const CALENDAR_PATH_REGEX = /^\/calendars\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;

function parseCalendarPath(key: string) {
  if (!CALENDAR_PATH_REGEX.test(key)) {
    return null;
  }

  const [, , calendarId, entryId] = key.split("/");

  return `${calendarId}/${entryId}`;
}
export async function parseMessage(message: unknown, dispatch: AppDispatch) {
  const calendarsToRefresh = new Set<string>();
  if (typeof message !== "object" || message === null) {
    return calendarsToRefresh;
  }
  const currentDate = getDisplayedDate();

  for (const [key, value] of Object.entries(message)) {
    switch (key) {
      case WS_OUTBOUND_EVENTS.REGISTER_CLIENT:
        value.forEach((cal: string) => calendarsToRefresh.add(cal));
        break;
      case WS_OUTBOUND_EVENTS.UNREGISTER_CLIENT:
        console.log("Unregistered Calendar", value);
        break;
      default: {
        calendarsToRefresh.add(key);
      }
    }
  }
  calendarsToRefresh.forEach((calendarPath) => {
    updateCalendar(calendarPath, dispatch, currentDate);
  });
  return calendarsToRefresh;
}

function updateCalendar(key: string, dispatch: AppDispatch, currentDate: Date) {
  const calendarId = parseCalendarPath(key) ?? "";
  const state = store.getState();
  const calendar = findCalendarById(state, calendarId);
  if (calendar) {
    dispatch(
      refreshCalendarWithSyncToken({
        calendar: calendar.calendar,
        calType: calendar.type,
        calendarRange: getCalendarRange(currentDate),
      })
    );
  }
}
