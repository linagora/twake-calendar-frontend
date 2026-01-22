import type { AppDispatch } from "@/app/store";
import { store } from "@/app/store";
import { refreshCalendarWithSyncToken } from "@/features/Calendars/services";
import { findCalendarById, getDisplayedCalendarRange } from "@/utils";
import { setSelectedCalendars } from "@/utils/storage/setSelectedCalendars";
import { parseCalendarPath } from "./parseCalendarPath";
import { parseMessage } from "./parseMessage";
import { debounce } from "lodash";

// Accumulate data from all messages
const calendarsToRefreshMap = new Map<string, any>();
const calendarsToHideSet = new Set<string>();

const debouncedUpdate = debounce(
  (dispatch: AppDispatch) => {
    const currentRange = getDisplayedCalendarRange();

    // Process all accumulated calendars to refresh
    calendarsToRefreshMap.forEach((calendar) => {
      dispatch(
        refreshCalendarWithSyncToken({
          calendar: calendar.calendar,
          calType: calendar.type,
          calendarRange: currentRange,
        })
      );
    });

    // Process all accumulated calendars to hide
    if (calendarsToHideSet.size > 0) {
      const currentSelectedCalendars = JSON.parse(
        localStorage.getItem("selectedCalendars") ?? "[]"
      ) as string[];

      const updatedSelectedCalendars = currentSelectedCalendars.filter(
        (id) => !calendarsToHideSet.has(id)
      );

      setSelectedCalendars(updatedSelectedCalendars);
    }

    // Clear accumulators
    calendarsToRefreshMap.clear();
    calendarsToHideSet.clear();
  },
  500,
  { leading: false, trailing: true }
);

export function updateCalendars(message: unknown, dispatch: AppDispatch) {
  const state = store.getState();
  const { calendarsToRefresh, calendarsToHide } = parseMessage(message);

  // Accumulate calendars to refresh
  calendarsToRefresh.forEach((calendarPath) => {
    const calendarId = parseCalendarPath(calendarPath);
    if (!calendarId) {
      console.warn("Invalid calendar path received:", calendarPath);
      return;
    }
    const calendar = findCalendarById(state, calendarId);
    if (calendar) {
      calendarsToRefreshMap.set(calendarId, calendar);
    } else {
      console.warn("Calendar not found for id:", calendarId);
    }
  });

  // Accumulate calendars to hide
  calendarsToHide.forEach((calendarPath) => {
    const calendarId = parseCalendarPath(calendarPath);
    if (calendarId) {
      calendarsToHideSet.add(calendarId);
    }
  });

  // Trigger debounced update
  debouncedUpdate(dispatch);
}
