import type { AppDispatch } from '@/app/store'
import { store } from '@/app/store'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import {
  getCalendarsListAsync,
  refreshCalendarWithSyncToken
} from '@/features/Calendars/services'
import { findCalendarById, getDisplayedCalendarRange } from '@/utils'
import { setSelectedCalendars } from '@/utils/storage/setSelectedCalendars'
import { debounce } from 'lodash'
import { parseCalendarPath } from './parseCalendarPath'
import { parseMessage } from './parseMessage'
import { UpdateCalendarsAccumulators } from './type/UpdateCalendarsAccumulators'

const DEFAULT_DEBOUNCE_MS = 0
const DEFAULT_WS_SKIP_DELAY_MS = 2000

function createDebouncedUpdate(
  debouncePeriodMs: number,
  getCalendarsToRefresh: () => Map<
    string,
    { calendar: Calendar; type?: 'temp' }
  >,
  getCalendarsToHide: () => Set<string>,
  getShouldRefreshCalendarList: () => boolean,
  resetShouldRefreshCalendarList: () => void
) {
  return debounce(
    async (dispatch: AppDispatch) => {
      // Snapshot state
      const calendarsToProcess = new Map(getCalendarsToRefresh())
      const calendarsToHideSnapshot = new Set(getCalendarsToHide())
      const shouldRefresh = getShouldRefreshCalendarList()

      // Clear accumulators
      getCalendarsToRefresh().clear()
      getCalendarsToHide().clear()
      resetShouldRefreshCalendarList()

      try {
        await processCalendarsToRefreshWithDelay(dispatch, calendarsToProcess)
        processCalendarsToHide(calendarsToHideSnapshot)

        if (shouldRefresh) {
          dispatch(getCalendarsListAsync())
        }
      } catch (error) {
        console.warn('Error processing accumulated calendar updates:', error)
      }
    },
    debouncePeriodMs,
    { leading: true, trailing: true }
  )
}

export function updateCalendars(
  message: unknown,
  dispatch: AppDispatch,
  accumulators: UpdateCalendarsAccumulators
) {
  const state = store.getState()
  const { calendarsToRefresh, calendarsToHide, shouldRefreshCalendarList } =
    parseMessage(message)

  // Accumulate
  accumulateCalendarsToRefresh(
    state,
    calendarsToRefresh,
    accumulators.calendarsToRefresh
  )
  accumulateCalendarsToHide(calendarsToHide, accumulators.calendarsToHide)

  accumulators.shouldRefreshCalendarListRef.current ||=
    shouldRefreshCalendarList

  const debouncePeriod = window.WS_DEBOUNCE_PERIOD_MS ?? DEFAULT_DEBOUNCE_MS

  if (debouncePeriod > 0) {
    if (
      !accumulators.debouncedUpdateFn ||
      accumulators.currentDebouncePeriod !== debouncePeriod
    ) {
      accumulators.debouncedUpdateFn = createDebouncedUpdate(
        debouncePeriod,
        () => accumulators.calendarsToRefresh,
        () => accumulators.calendarsToHide,
        () => accumulators.shouldRefreshCalendarListRef.current,
        () => {
          accumulators.shouldRefreshCalendarListRef.current = false
        }
      )
      accumulators.currentDebouncePeriod = debouncePeriod
    }
    accumulators.debouncedUpdateFn(dispatch)
    return
  }

  // Immediate processing if debounce disabled
  const calendarsToProcess = new Map(accumulators.calendarsToRefresh)
  const calendarsToHideSnapshot = new Set(accumulators.calendarsToHide)

  accumulators.calendarsToRefresh.clear()
  accumulators.calendarsToHide.clear()
  accumulators.shouldRefreshCalendarListRef.current = false

  void (async () => {
    try {
      await processCalendarsToRefreshWithDelay(dispatch, calendarsToProcess)
      processCalendarsToHide(calendarsToHideSnapshot)
      if (shouldRefreshCalendarList) {
        dispatch(getCalendarsListAsync())
      }
    } catch (error) {
      console.warn('Error processing calendar updates:', error)
    }
  })()
}

// --- Helpers ---
async function processCalendarsToRefreshWithDelay(
  dispatch: AppDispatch,
  calendarsMap: Map<string, { calendar: Calendar; type?: 'temp' }>
) {
  const skipDelayMs = window.WS_SKIP_DELAY_MS ?? DEFAULT_WS_SKIP_DELAY_MS
  await new Promise<void>(resolve => setTimeout(resolve, skipDelayMs))

  const currentState = store.getState()
  const currentRange = getDisplayedCalendarRange()

  calendarsMap.forEach(({ calendar, type }, calId) => {
    const current = findCalendarById(currentState, calId)
    if (current && current.calendar.syncToken !== calendar.syncToken) return

    dispatch(
      refreshCalendarWithSyncToken({
        calendar: current?.calendar ?? calendar,
        calType: type,
        calendarRange: currentRange
      })
    )
  })
}

function accumulateCalendarsToRefresh(
  state: ReturnType<typeof store.getState>,
  calendarPaths: Set<string>,
  calendarsToRefreshMap: Map<string, { calendar: Calendar; type?: 'temp' }>
) {
  calendarPaths.forEach(calendarPath => {
    const calendarId = parseCalendarPath(calendarPath)
    if (!calendarId) {
      console.warn('Invalid calendar path received:', calendarPath)
      return
    }
    const calendar = findCalendarById(state, calendarId)
    if (!calendar) {
      console.warn('Calendar not found for id:', calendarId)
      return
    }
    calendarsToRefreshMap.set(calendarId, calendar)
  })
}

function accumulateCalendarsToHide(
  calendarPaths: Set<string>,
  calendarsToHideSet: Set<string>
) {
  calendarPaths.forEach(calendarPath => {
    const calendarId = parseCalendarPath(calendarPath)
    if (calendarId) {
      calendarsToHideSet.add(calendarId)
    }
  })
}

function processCalendarsToHide(calendarsToHideSnapshot: Set<string>) {
  if (calendarsToHideSnapshot.size === 0) return

  let currentSelectedCalendars: string[]

  try {
    const stored = localStorage.getItem('selectedCalendars') ?? '[]'
    currentSelectedCalendars = JSON.parse(stored)
  } catch (error) {
    console.warn('Failed to parse selectedCalendars from localStorage:', error)
    return
  }

  const updatedSelectedCalendars = currentSelectedCalendars.filter(
    id => !calendarsToHideSnapshot.has(id)
  )

  setSelectedCalendars(updatedSelectedCalendars)
}
