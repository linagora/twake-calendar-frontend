import { AppDispatch } from "@/app/store";

export interface UpdateCalendarsAccumulators {
  calendarsToRefresh: Map<string, any>;
  calendarsToHide: Set<string>;
  debouncedUpdateFn?: (dispatch: AppDispatch) => void;
  currentDebouncePeriod?: number;
}
