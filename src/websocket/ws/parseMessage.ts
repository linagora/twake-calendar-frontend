import { useAppSelector } from "../../app/hooks";
import { AppDispatch, store } from "../../app/store";
import { refreshCalendarWithSyncToken } from "../../features/Calendars/services/refreshCalendar";
import { getDisplayedDate } from "../../utils/calendarDateManager";
import { getCalendarRange } from "../../utils/dateUtils";
import { WS_OUTBOUND_EVENTS } from "../protocols";
import { findCalendarById } from "../../utils/findCalendarById";
const CALENDAR_PATH_REGEX = /^\/calendars\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;

function parseCalendarPath(key: string) {
  if (!CALENDAR_PATH_REGEX.test(key)) {
    return null;
  }

  const [, , calendarId, entryId] = key.split("/");

  return `${calendarId}/${entryId}`;
}
export async function parseMessage(message: unknown, dispatch: AppDispatch) {
  if (typeof message !== "object" || message === null) {
    return [];
  }
  let calendarsToRefresh: string[] = [];
  const currentDate = getDisplayedDate();

  for (const [key, value] of Object.entries(message)) {
    switch (key) {
      case WS_OUTBOUND_EVENTS.REGISTER_CLIENT:
        calendarsToRefresh = calendarsToRefresh.concat(
          value,
          calendarsToRefresh
        );
        break;
      case WS_OUTBOUND_EVENTS.UNREGISTER_CLIENT:
        console.log("Unregistered Calendar", value);
        break;
      default: {
        calendarsToRefresh.push(key);
      }
    }
  }
  calendarsToRefresh.map((calendarPath) => {
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
