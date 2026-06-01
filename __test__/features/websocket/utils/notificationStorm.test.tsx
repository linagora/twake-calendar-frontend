import type { AppDispatch, RootState } from '@common/app/store'
import { store } from '@common/app/store'
import { refreshCalendarWithSyncToken } from '@common/features/Calendars/CalendarSlice'
import { getDisplayedCalendarRange } from '@common/utils'
import { updateCalendars } from '@common/websocket/messaging/updateCalendars'

jest.mock('@common/features/Calendars/CalendarSlice', () => ({
  ...jest.requireActual('@common/features/Calendars/CalendarSlice'),
  refreshCalendarWithSyncToken: jest.fn()
}))

jest.mock('@common/utils', () => ({
  getDisplayedCalendarRange: jest.fn(),
  findCalendarById: jest.requireActual('@common/utils').findCalendarById
}))

jest.mock('@common/app/store', () => ({
  store: {
    getState: jest.fn()
  }
}))

jest.useFakeTimers()
const mockDispatch = jest.fn()
const mockRange = {
  start: new Date('2025-01-15T10:00:00Z'),
  end: new Date('2025-01-16T10:00:00Z')
}
const mockState = {
  calendars: {
    list: {
      'cal1/entry1': { id: 'cal1/entry1', name: 'Calendar 1', syncToken: 1 },
      'cal2/entry2': { id: 'cal2/entry2', name: 'Calendar 2', syncToken: 1 },
      'cal/A': { id: 'cal/A', name: 'Cal A', syncToken: 1 },
      'cal/B': { id: 'cal/B', name: 'Cal B', syncToken: 1 },
      'cal/C': { id: 'cal/C', name: 'Cal C', syncToken: 1 }
    },
    templist: {}
  }
} as unknown as RootState
const mockAccumulators: {
  calendarsToRefresh: Map<string, any>
  calendarsToHide: Set<string>
  debouncedUpdateFns: Map<string, (dispatch: AppDispatch) => void>
  debouncedListUpdateFn?: (dispatch: AppDispatch) => void
  shouldRefreshCalendarListRef: React.MutableRefObject<boolean>
  currentDebouncePeriod?: number
  delayedRefreshTimers?: Map<string, ReturnType<typeof setTimeout>>
} = {
  calendarsToRefresh: new Map<string, any>(),
  calendarsToHide: new Set(),
  debouncedUpdateFns: new Map(),
  shouldRefreshCalendarListRef: { current: false },
  currentDebouncePeriod: 0,
  delayedRefreshTimers: new Map()
}

describe('websocket messages storm', () => {
  beforeEach(() => {
    ;(refreshCalendarWithSyncToken as unknown as jest.Mock).mockClear()
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.resetModules()
    ;(getDisplayedCalendarRange as jest.Mock).mockReturnValue(mockRange)
    ;(store.getState as jest.Mock).mockReturnValue(mockState)
    window.WS_DEBOUNCE_PERIOD_MS = 500
    window.WS_SKIP_DELAY_MS = 0
    mockAccumulators.calendarsToRefresh = new Map<string, any>()
    mockAccumulators.calendarsToHide = new Set()
    mockAccumulators.debouncedUpdateFns = new Map()
    mockAccumulators.debouncedListUpdateFn = undefined
    mockAccumulators.shouldRefreshCalendarListRef.current = false
    mockAccumulators.currentDebouncePeriod = 0
    mockAccumulators.delayedRefreshTimers = new Map()
  })
  it('debounces calendar updates during message storm', () => {
    const mockMessage = {
      '/calendars/cal1/entry1': {
        syncToken: 'ldsk'
      }
    }

    for (let i = 0; i < 50; i++) {
      updateCalendars(mockMessage, mockDispatch, mockAccumulators)
    }

    // Dispatch called once because of leading edge
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(1)

    // Trailing edge
    jest.advanceTimersByTime(500)

    // only one call for the last message + leading edge message
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(2)
  })

  it('debounces calendar updates during message storm with multiple updates', () => {
    // Send a storm with mixed messages
    for (let i = 0; i < 50; i++) {
      if (i % 3 === 0)
        updateCalendars(
          { '/calendars/cal/A': { syncToken: 'ldskfjsld' + i } },
          mockDispatch,
          mockAccumulators
        )
      else if (i % 3 === 1)
        updateCalendars(
          { '/calendars/cal/B': { syncToken: 'ldskfjsld' + i } },
          mockDispatch,
          mockAccumulators
        )
      else
        updateCalendars(
          { '/calendars/cal/C': { syncToken: 'ldskfjsld' + i } },
          mockDispatch,
          mockAccumulators
        )
    }

    // Each calendar's leading edge triggers immediately (3 calendars)
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(3)

    // Trailing edge
    jest.advanceTimersByTime(500)

    // Trailing edge updates once per calendar (3 calls) + the 3 leading edge calls = 6 calls
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(6)
  })

  it('executes immediately when debounce is disabled', () => {
    window.WS_DEBOUNCE_PERIOD_MS = 0

    updateCalendars(
      { '/calendars/cal1/entry1': { syncToken: 'abc' } },
      mockDispatch,
      mockAccumulators
    )

    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(1)
  })

  it('bypasses skip delay for non-owned calendars and applies delay to owned calendars', () => {
    window.WS_DEBOUNCE_PERIOD_MS = 0
    window.WS_SKIP_DELAY_MS = 2000

    const customState = {
      user: { userData: { openpaasId: 'user1' } },
      calendars: {
        list: {
          'user1/cal1': {
            id: 'user1/cal1',
            name: 'Own Calendar',
            syncToken: 1
          },
          'user2/cal2': {
            id: 'user2/cal2',
            name: 'Other Calendar',
            syncToken: 1
          }
        },
        templist: {}
      }
    } as unknown as RootState

    ;(store.getState as jest.Mock).mockReturnValue(customState)

    updateCalendars(
      {
        '/calendars/user1/cal1': { syncToken: 'abc' },
        '/calendars/user2/cal2': { syncToken: 'xyz' }
      },
      mockDispatch,
      mockAccumulators
    )

    // user2/cal2 (non-owned) should refresh immediately
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(1)
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledWith({
      calendar: customState.calendars.list['user2/cal2'],
      calType: undefined,
      calendarRange: mockRange
    })

    // user1/cal1 (owned) should not refresh immediately
    expect(refreshCalendarWithSyncToken).not.toHaveBeenCalledWith({
      calendar: customState.calendars.list['user1/cal1'],
      calType: undefined,
      calendarRange: mockRange
    })

    // Advance timer by 2 seconds
    jest.advanceTimersByTime(2000)

    // Now user1/cal1 (owned) should also have refreshed
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledTimes(2)
    expect(refreshCalendarWithSyncToken).toHaveBeenCalledWith({
      calendar: customState.calendars.list['user1/cal1'],
      calType: undefined,
      calendarRange: mockRange
    })
  })
})
