import { AppDispatch, store } from '@common/app/store'
import {
  emptyEventsCal,
  getCalendarDetail,
  getCalendarsList
} from '@common/features/Calendars/CalendarSlice'
import { refreshCalendarWithSyncToken } from '@common/features/Calendars/CalendarSlice'
import { Calendar } from '@common/types/CalendarTypes'
import { findCalendarById, getDisplayedCalendarRange } from '@common/utils'
import { formatDateToYYYYMMDDTHHMMSS } from '@common/utils/dateUtils'
import { setSelectedCalendars } from '@common/utils/storage/setSelectedCalendars'
import { debounce, DebouncedFunc } from 'lodash'
import type { MutableRefObject } from 'react'
import { parseCalendarPath } from './parseCalendarPath'
import { parseMessage } from './parseMessage'
import { UpdateCalendarsAccumulators } from './type/UpdateCalendarsAccumulators'

const DEFAULT_DEBOUNCE_MS = 0
const DEFAULT_WS_SKIP_DELAY_MS = 2000

function createDebouncedCalendarUpdate({
  calId,
  debouncePeriodMs,
  calendarsToRefresh,
  calendarsToHide,
  delayedRefreshTimers
}: {
  calId: string
  debouncePeriodMs: number
  calendarsToRefresh: Map<string, { calendar: Calendar; type?: 'temp' }>
  calendarsToHide: Set<string>
  delayedRefreshTimers?: Map<string, ReturnType<typeof setTimeout>>
}): DebouncedFunc<(dispatch: AppDispatch) => void> {
  return debounce(
    (dispatch: AppDispatch): void => {
      const currentRange = getDisplayedCalendarRange()

      // Snapshot individual calendar states
      const refreshInfo = calendarsToRefresh.get(calId)
      const shouldHide = calendarsToHide.has(calId)

      // Clear the individual calendar from accumulators
      calendarsToRefresh.delete(calId)
      calendarsToHide.delete(calId)

      try {
        if (refreshInfo) {
          const calendarsMap = new Map([[calId, refreshInfo]])
          scheduleCalendarsRefresh(
            dispatch,
            currentRange,
            calendarsMap,
            delayedRefreshTimers
          )
        }
        if (shouldHide) {
          const hideSet = new Set([calId])
          processCalendarsToHide(hideSet)
        }
      } catch (error) {
        console.warn(
          `Error processing accumulated calendar updates for ${calId}:`,
          error
        )
      }
    },
    debouncePeriodMs,
    { leading: true, trailing: true }
  )
}

function createDebouncedListUpdate(
  debouncePeriodMs: number,
  shouldRefreshCalendarListRef: MutableRefObject<boolean>
): DebouncedFunc<(dispatch: AppDispatch) => void> {
  return debounce(
    (dispatch: AppDispatch): void => {
      const shouldRefresh = shouldRefreshCalendarListRef.current

      // Clear accumulator
      shouldRefreshCalendarListRef.current = false

      try {
        if (shouldRefresh) {
          void dispatch(getCalendarsList())
        }
      } catch (error) {
        console.warn(
          'Error processing accumulated calendar list update:',
          error
        )
      }
    },
    debouncePeriodMs,
    { leading: true, trailing: true }
  )
}

function processDebouncedUpdates({
  dispatch,
  accumulators,
  debouncePeriod,
  shouldRefreshCalendarList,
  calendarsToRefresh,
  calendarsToHide
}: {
  dispatch: AppDispatch
  accumulators: UpdateCalendarsAccumulators
  debouncePeriod: number
  shouldRefreshCalendarList: boolean
  calendarsToRefresh: Set<string>
  calendarsToHide: Set<string>
}): void {
  if (accumulators.currentDebouncePeriod !== debouncePeriod) {
    accumulators.debouncedUpdateFns.forEach(fn => fn.cancel())
    accumulators.debouncedUpdateFns.clear()
    accumulators.debouncedListUpdateFn?.cancel()
    accumulators.debouncedListUpdateFn = undefined
    accumulators.currentDebouncePeriod = debouncePeriod
  }

  const uniqueCalIds = new Set<string>()
  calendarsToRefresh.forEach(path => {
    const calId = parseCalendarPath(path)
    if (calId) uniqueCalIds.add(calId)
  })
  calendarsToHide.forEach(path => {
    const calId = parseCalendarPath(path)
    if (calId) uniqueCalIds.add(calId)
  })

  uniqueCalIds.forEach(calendarId => {
    let debouncedFn = accumulators.debouncedUpdateFns.get(calendarId)
    if (!debouncedFn) {
      debouncedFn = createDebouncedCalendarUpdate({
        calId: calendarId,
        debouncePeriodMs: debouncePeriod,
        calendarsToRefresh: accumulators.calendarsToRefresh,
        calendarsToHide: accumulators.calendarsToHide,
        delayedRefreshTimers: accumulators.delayedRefreshTimers
      })
      accumulators.debouncedUpdateFns.set(calendarId, debouncedFn)
    }
    debouncedFn(dispatch)
  })

  if (shouldRefreshCalendarList) {
    let debouncedListFn = accumulators.debouncedListUpdateFn
    if (!debouncedListFn) {
      debouncedListFn = createDebouncedListUpdate(
        debouncePeriod,
        accumulators.shouldRefreshCalendarListRef
      )
      accumulators.debouncedListUpdateFn = debouncedListFn
    }
    debouncedListFn(dispatch)
  }
}

function processImmediateUpdates(
  dispatch: AppDispatch,
  accumulators: UpdateCalendarsAccumulators,
  shouldRefreshCalendarList: boolean
): void {
  const currentRange = getDisplayedCalendarRange()
  const calendarsToProcess = new Map(accumulators.calendarsToRefresh)
  const calendarsToHideSnapshot = new Set(accumulators.calendarsToHide)

  accumulators.calendarsToRefresh.clear()
  accumulators.calendarsToHide.clear()
  accumulators.shouldRefreshCalendarListRef.current = false

  try {
    scheduleCalendarsRefresh(
      dispatch,
      currentRange,
      calendarsToProcess,
      accumulators.delayedRefreshTimers
    )
    processCalendarsToHide(calendarsToHideSnapshot)
    if (shouldRefreshCalendarList) {
      void dispatch(getCalendarsList())
    }
  } catch (error) {
    console.warn('Error processing calendar updates:', error)
  }
}

export function updateCalendars(
  message: unknown,
  dispatch: AppDispatch,
  accumulators: UpdateCalendarsAccumulators
): void {
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

  // Cancel delayed refresh timers for any calendars that are being hidden/removed
  calendarsToHide.forEach(path => {
    const calId = parseCalendarPath(path)
    if (calId) {
      const timer = accumulators.delayedRefreshTimers?.get(calId)
      if (timer) {
        clearTimeout(timer)
        accumulators.delayedRefreshTimers?.delete(calId)
      }
    }
  })

  accumulators.shouldRefreshCalendarListRef.current =
    accumulators.shouldRefreshCalendarListRef.current ||
    shouldRefreshCalendarList

  const debouncePeriod = window.WS_DEBOUNCE_PERIOD_MS ?? DEFAULT_DEBOUNCE_MS

  if (debouncePeriod > 0) {
    processDebouncedUpdates({
      dispatch,
      accumulators,
      debouncePeriod,
      shouldRefreshCalendarList,
      calendarsToRefresh,
      calendarsToHide
    })
  } else {
    processImmediateUpdates(dispatch, accumulators, shouldRefreshCalendarList)
  }
}

// --- Helpers ---
function triggerCalendarRefresh(
  dispatch: AppDispatch,
  calendar: Calendar,
  type: 'temp' | undefined,
  range: { start: Date; end: Date }
): void {
  if (calendar.syncToken) {
    void dispatch(
      refreshCalendarWithSyncToken({
        calendar,
        calType: type,
        calendarRange: range
      })
    )
  } else {
    dispatch(emptyEventsCal({ calId: calendar.id, calType: type }))
    void dispatch(
      getCalendarDetail({
        calId: calendar.id,
        match: {
          start: formatDateToYYYYMMDDTHHMMSS(range.start),
          end: formatDateToYYYYMMDDTHHMMSS(range.end)
        },
        calType: type
      })
    )
  }
}

interface CalendarGroup {
  immediate: Map<string, { calendar: Calendar; type?: 'temp' }>
  delayed: Map<string, { calendar: Calendar; type?: 'temp' }>
}

function groupCalendarsByOwner(
  calendarsMap: Map<string, { calendar: Calendar; type?: 'temp' }>,
  currentUserId?: string
): CalendarGroup {
  const immediate = new Map<string, { calendar: Calendar; type?: 'temp' }>()
  const delayed = new Map<string, { calendar: Calendar; type?: 'temp' }>()

  calendarsMap.forEach((val, calId) => {
    const ownerId = calId.split('/')[0]
    const isOwnCalendar = Boolean(currentUserId && ownerId === currentUserId)
    if (isOwnCalendar) {
      delayed.set(calId, val)
    } else {
      immediate.set(calId, val)
    }
  })

  return { immediate, delayed }
}

function processDelayedCalendars(
  dispatch: AppDispatch,
  delayedCalendars: Map<string, { calendar: Calendar; type?: 'temp' }>
): void {
  const stateAfterDelay = store.getState()
  const rangeAfterDelay = getDisplayedCalendarRange()

  delayedCalendars.forEach(({ calendar, type }, calId) => {
    const current = findCalendarById(stateAfterDelay, calId)
    if (current && current.calendar.syncToken !== calendar.syncToken) return
    triggerCalendarRefresh(
      dispatch,
      current?.calendar ?? calendar,
      type,
      rangeAfterDelay
    )
  })
}

function scheduleDelayedUpdateForOwnCalendars(
  delayed: Map<string, { calendar: Calendar; type?: 'temp' }>,
  dispatch: AppDispatch,
  skipDelayMs: number,
  delayedRefreshTimers?: Map<string, ReturnType<typeof setTimeout>>
): void {
  delayed.forEach((val, calId) => {
    // Clear any existing timer for this calendar to avoid duplicates
    const existing = delayedRefreshTimers?.get(calId)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = setTimeout(() => {
      delayedRefreshTimers?.delete(calId)
      processDelayedCalendars(dispatch, new Map([[calId, val]]))
    }, skipDelayMs)

    delayedRefreshTimers?.set(calId, timer)
  })
}

function scheduleCalendarsRefresh(
  dispatch: AppDispatch,
  currentRange: { start: Date; end: Date },
  calendarsMap: Map<string, { calendar: Calendar; type?: 'temp' }>,
  delayedRefreshTimers?: Map<string, ReturnType<typeof setTimeout>>
): void {
  const state = store.getState()
  const currentUserId = state.user?.userData?.openpaasId

  const skipDelayMs = window.WS_SKIP_DELAY_MS ?? DEFAULT_WS_SKIP_DELAY_MS

  if (skipDelayMs === 0) {
    dispatchCalendarsRefresh(dispatch, currentRange, calendarsMap)
    return
  }

  const { immediate, delayed } = groupCalendarsByOwner(
    calendarsMap,
    currentUserId
  )

  // Dispatch immediate updates
  if (immediate.size > 0) {
    dispatchCalendarsRefresh(dispatch, currentRange, immediate)
  }

  if (delayed.size <= 0) return

  // Schedule delayed updates for own calendars
  scheduleDelayedUpdateForOwnCalendars(
    delayed,
    dispatch,
    skipDelayMs,
    delayedRefreshTimers
  )
}

function dispatchCalendarsRefresh(
  dispatch: AppDispatch,
  currentRange: { start: Date; end: Date },
  calendarsMap: Map<string, { calendar: Calendar; type?: 'temp' }>
): void {
  calendarsMap.forEach(({ calendar, type }) => {
    triggerCalendarRefresh(dispatch, calendar, type, currentRange)
  })
}

function accumulateCalendarsToRefresh(
  state: ReturnType<typeof store.getState>,
  calendarPaths: Set<string>,
  calendarsToRefreshMap: Map<string, { calendar: Calendar; type?: 'temp' }>
): void {
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
): void {
  calendarPaths.forEach(calendarPath => {
    const calendarId = parseCalendarPath(calendarPath)
    if (calendarId) {
      calendarsToHideSet.add(calendarId)
    }
  })
}

function processCalendarsToHide(calendarsToHideSnapshot: Set<string>): void {
  if (calendarsToHideSnapshot.size === 0) return

  let currentSelectedCalendars: string[]

  try {
    const stored = localStorage.getItem('selectedCalendars') ?? '[]'
    currentSelectedCalendars = JSON.parse(stored) as string[]
  } catch (error) {
    console.warn('Failed to parse selectedCalendars from localStorage:', error)
    return
  }

  const updatedSelectedCalendars = currentSelectedCalendars.filter(
    id => !calendarsToHideSnapshot.has(id)
  )

  setSelectedCalendars(updatedSelectedCalendars)
}
