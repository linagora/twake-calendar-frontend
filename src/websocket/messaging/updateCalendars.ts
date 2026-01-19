import type { AppDispatch } from "@/app/store";
import { store } from "@/app/store";
import { refreshCalendarWithSyncToken } from "@/features/Calendars/services/refreshCalendar";
import { findCalendarById, getDisplayedCalendarRange } from "@/utils";
import { setSelectedCalendars } from "@/utils/storage/setSelectedCalendars";
import { parseCalendarPath } from "./parseCalendarPath";
import { parseMessage } from "./parseMessage";

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
  const currentSelectedCalendars = JSON.parse(
    localStorage.getItem("selectedCalendars") ?? "[]"
  ) as string[];

  const calendarIdsToHide = [...calendarsToHide]
    .map(parseCalendarPath)
    .filter((id): id is string => Boolean(id));

  const updatedSelectedCalendars = currentSelectedCalendars.filter(
    (id) => !calendarIdsToHide.includes(id)
  );

  setSelectedCalendars(updatedSelectedCalendars);
}
