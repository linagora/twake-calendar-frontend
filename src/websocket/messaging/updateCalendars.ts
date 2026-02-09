import type { AppDispatch } from "@/app/store";
import { store } from "@/app/store";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { refreshCalendarWithSyncToken } from "@/features/Calendars/services";
import { findCalendarById, getDisplayedCalendarRange } from "@/utils";
import { setSelectedCalendars } from "@/utils/storage/setSelectedCalendars";
import { debounce } from "lodash";
import { parseCalendarPath } from "./parseCalendarPath";
import { parseMessage } from "./parseMessage";
import { UpdateCalendarsAccumulators } from "./type/UpdateCalendarsAccumulators";

const DEFAULT_DEBOUNCE_MS = 0;

function createDebouncedUpdate(
  debouncePeriodMs: number,
  getCalendarsToRefresh: () => Map<
    string,
    { calendar: Calendar; type?: "temp" }
  >,
  getCalendarsToHide: () => Set<string>
) {
  return debounce(
    (dispatch: AppDispatch) => {
      const currentRange = getDisplayedCalendarRange();

      // Snapshot state
      const calendarsToProcess = new Map(getCalendarsToRefresh());
      const calendarsToHideSnapshot = new Set(getCalendarsToHide());

      // Clear accumulators
      getCalendarsToRefresh().clear();
      getCalendarsToHide().clear();

      try {
        processCalendarsToRefresh(dispatch, currentRange, calendarsToProcess);
        processCalendarsToHide(calendarsToHideSnapshot);
      } catch (error) {
        console.warn("Error processing accumulated calendar updates:", error);
      }
    },
    debouncePeriodMs,
    { leading: true, trailing: true }
  );
}

export function updateCalendars(
  message: unknown,
  dispatch: AppDispatch,
  accumulators: UpdateCalendarsAccumulators
) {
  const state = store.getState();
  const { calendarsToRefresh, calendarsToHide } = parseMessage(message);

  // Accumulate
  accumulateCalendarsToRefresh(
    state,
    calendarsToRefresh,
    accumulators.calendarsToRefresh
  );
  accumulateCalendarsToHide(calendarsToHide, accumulators.calendarsToHide);

  const debouncePeriod = window.WS_DEBOUNCE_PERIOD_MS ?? DEFAULT_DEBOUNCE_MS;

  if (debouncePeriod > 0) {
    if (
      !accumulators.debouncedUpdateFn ||
      accumulators.currentDebouncePeriod !== debouncePeriod
    ) {
      accumulators.debouncedUpdateFn = createDebouncedUpdate(
        debouncePeriod,
        () => accumulators.calendarsToRefresh,
        () => accumulators.calendarsToHide
      );
      accumulators.currentDebouncePeriod = debouncePeriod;
    }
    accumulators.debouncedUpdateFn(dispatch);
    return;
  }

  // Immediate processing if debounce disabled
  const currentRange = getDisplayedCalendarRange();
  const calendarsToProcess = new Map(accumulators.calendarsToRefresh);
  const calendarsToHideSnapshot = new Set(accumulators.calendarsToHide);

  accumulators.calendarsToRefresh.clear();
  accumulators.calendarsToHide.clear();

  try {
    processCalendarsToRefresh(dispatch, currentRange, calendarsToProcess);
    processCalendarsToHide(calendarsToHideSnapshot);
  } catch (error) {
    console.warn("Error processing calendar updates:", error);
  }
}

// --- Helpers ---
function accumulateCalendarsToRefresh(
  state: ReturnType<typeof store.getState>,
  calendarPaths: Set<string>,
  calendarsToRefreshMap: Map<string, { calendar: Calendar; type?: "temp" }>
) {
  calendarPaths.forEach((calendarPath) => {
    const calendarId = parseCalendarPath(calendarPath);
    if (!calendarId) {
      console.warn("Invalid calendar path received:", calendarPath);
      return;
    }
    const calendar = findCalendarById(state, calendarId);
    if (!calendar) {
      console.warn("Calendar not found for id:", calendarId);
      return;
    }
    calendarsToRefreshMap.set(calendarId, calendar);
  });
}

function accumulateCalendarsToHide(
  calendarPaths: Set<string>,
  calendarsToHideSet: Set<string>
) {
  calendarPaths.forEach((calendarPath) => {
    const calendarId = parseCalendarPath(calendarPath);
    if (calendarId) {
      calendarsToHideSet.add(calendarId);
    }
  });
}

function processCalendarsToRefresh(
  dispatch: AppDispatch,
  currentRange: { start: Date; end: Date },
  calendarsMap: Map<string, { calendar: Calendar; type?: "temp" }>
) {
  calendarsMap.forEach((calendar) => {
    dispatch(
      refreshCalendarWithSyncToken({
        calendar: calendar.calendar,
        calType: calendar.type,
        calendarRange: currentRange,
      })
    );
  });
}

function processCalendarsToHide(calendarsToHideSnapshot: Set<string>) {
  if (calendarsToHideSnapshot.size === 0) return;

  let currentSelectedCalendars: string[];

  try {
    const stored = localStorage.getItem("selectedCalendars") ?? "[]";
    currentSelectedCalendars = JSON.parse(stored);
  } catch (error) {
    console.warn("Failed to parse selectedCalendars from localStorage:", error);
    return;
  }

  const updatedSelectedCalendars = currentSelectedCalendars.filter(
    (id) => !calendarsToHideSnapshot.has(id)
  );

  setSelectedCalendars(updatedSelectedCalendars);
}
