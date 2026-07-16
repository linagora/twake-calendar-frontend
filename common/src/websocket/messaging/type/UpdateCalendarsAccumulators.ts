import { AppDispatch } from '@common/app/store'
import { Calendar } from '@common/types/CalendarTypes'
import { DebouncedFunc } from 'lodash'

export interface UpdateCalendarsAccumulators {
  calendarsToRefresh: Map<string, { calendar: Calendar; type?: 'temp' }>
  calendarsToHide: Set<string>
  shouldRefreshCalendarListRef: React.MutableRefObject<boolean>
  shouldRefreshBookingLinksRef: React.MutableRefObject<boolean>
  debouncedUpdateFns: Map<
    string,
    DebouncedFunc<(dispatch: AppDispatch) => void>
  >
  debouncedListUpdateFn?: DebouncedFunc<(dispatch: AppDispatch) => void>
  debouncedBookingLinksUpdateFn?: DebouncedFunc<(dispatch: AppDispatch) => void>
  currentDebouncePeriod?: number
  delayedRefreshTimers?: Map<string, ReturnType<typeof setTimeout>>
}
