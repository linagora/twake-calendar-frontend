import { AppDispatch } from "@/app/store";
import { Calendar } from "@/features/Calendars/CalendarTypes";

export interface UpdateCalendarsAccumulators {
  calendarsToRefresh: Map<string, { calendar: Calendar; type?: "temp" }>;
  calendarsToHide: Set<string>;
  debouncedUpdateFn?: (dispatch: AppDispatch) => void;
  currentDebouncePeriod?: number;
}
