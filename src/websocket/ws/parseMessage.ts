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
export function parseMessage(message: unknown, dispatch: AppDispatch) {
  if (typeof message !== "object" || message === null) {
    return [];
  }
  let calendarsToRefresh: string[] = [];
  const currentDate = getDisplayedDate();

  for (const [key, value] of Object.entries(message)) {
    switch (key) {
      case WS_OUTBOUND_EVENTS.REGISTER_CLIENT:
        console.log("Registered Calendar", value);
        calendarsToRefresh = calendarsToRefresh.concat(
          value,
          calendarsToRefresh
        );
        break;

      case WS_OUTBOUND_EVENTS.UNREGISTER_CLIENT:
        console.log("Unregistered Calendar", value);
        break;

      default: {
        const calendarId = parseCalendarPath(key) ?? "";
        const state = store.getState();
        const { calendar, type } = findCalendarById(state, calendarId);
        dispatch(
          refreshCalendarWithSyncToken({
            calendar: calendar,
            calType: type,
            calendarRange: getCalendarRange(currentDate),
          })
        );
      }
    }
  }
  return calendarsToRefresh;
}


