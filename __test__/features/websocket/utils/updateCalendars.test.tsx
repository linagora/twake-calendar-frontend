import { AppDispatch, RootState, store } from '@common/app/store'
import {
  emptyEventsCal,
  getCalendarDetail,
  refreshCalendarWithSyncToken
} from '@common/features/Calendars/CalendarSlice'
import { getDisplayedCalendarRange } from '@common/utils'
import { formatDateToYYYYMMDDTHHMMSS } from '@common/utils/dateUtils'
import { updateCalendars } from '@common/websocket/messaging/updateCalendars'
import { WS_INBOUND_EVENTS } from '@common/websocket/protocols'
import { waitFor } from '@testing-library/dom'

jest.mock('@common/utils/CalendarRangeManager')

jest.mock('@common/features/Calendars/CalendarSlice', () => {
  const original = jest.requireActual(
    '@common/features/Calendars/CalendarSlice'
  )
  return {
    ...original,
    emptyEventsCal: jest.fn(args => ({
      type: 'mock/emptyEventsCal',
      payload: args
    })),
    getCalendarDetail: jest.fn(args => ({
      type: 'mock/getCalendarDetail',
      payload: args
    })),
    refreshCalendarWithSyncToken: jest.fn(args => ({
      type: 'mock/refreshCalendarWithSyncToken',
      payload: args
    }))
  }
})

const mockRefreshCalendarWithSyncToken =
  refreshCalendarWithSyncToken as unknown as jest.Mock

jest.mock('@common/app/store', () => ({
  store: {
    getState: jest.fn()
  }
}))

describe('updateCalendars', () => {
  let mockDispatch: jest.Mock
  const mockRange = {
    start: new Date('2025-01-15T10:00:00Z'),
    end: new Date('2025-01-16T10:00:00Z')
  }

  const mockState = {
    calendars: {
      list: {
        'cal1/entry1': { id: 'cal1/entry1', name: 'Calendar 1', syncToken: 1 },
        'cal2/entry2': { id: 'cal2/entry2', name: 'Calendar 2', syncToken: 1 }
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
  } = {
    calendarsToRefresh: new Map<string, any>(),
    calendarsToHide: new Set(),
    debouncedUpdateFns: new Map(),
    shouldRefreshCalendarListRef: { current: false },
    currentDebouncePeriod: 0
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDispatch = jest.fn()
    ;(getDisplayedCalendarRange as jest.Mock).mockReturnValue(mockRange)
    ;(store.getState as jest.Mock).mockReturnValue(mockState)
    mockAccumulators.calendarsToRefresh = new Map<string, any>()
    mockAccumulators.calendarsToHide = new Set()
    mockAccumulators.debouncedUpdateFns = new Map()
    mockAccumulators.debouncedListUpdateFn = undefined
    mockAccumulators.currentDebouncePeriod = 0
    mockAccumulators.shouldRefreshCalendarListRef.current = false
    window.WS_SKIP_DELAY_MS = 0
  })

  it('should not dispatch for non-object messages', () => {
    updateCalendars(null, mockDispatch, mockAccumulators)
    updateCalendars('string', mockDispatch, mockAccumulators)
    updateCalendars(123, mockDispatch, mockAccumulators)

    expect(mockRefreshCalendarWithSyncToken).not.toHaveBeenCalled()
  })

  it('should dispatch for registered calendars', async () => {
    const message = {
      [WS_INBOUND_EVENTS.CLIENT_REGISTERED]: [
        '/calendars/cal1/entry1',
        '/calendars/cal2/entry2'
      ]
    }

    updateCalendars(message, mockDispatch, mockAccumulators)

    await waitFor(() =>
      expect(mockRefreshCalendarWithSyncToken).toHaveBeenCalledTimes(2)
    )
  })

  it('should dispatch for calendar path updates', async () => {
    const message = {
      '/calendars/cal1/entry1': { updated: true }
    }

    updateCalendars(message, mockDispatch, mockAccumulators)
    await waitFor(() =>
      expect(mockRefreshCalendarWithSyncToken).toHaveBeenCalled()
    )
    expect(mockRefreshCalendarWithSyncToken).toHaveBeenCalledWith({
      calendar: mockState.calendars.list['cal1/entry1'],
      calType: undefined,
      calendarRange: mockRange
    })
  })

  it('should use displayed calendar range', async () => {
    const message = {
      '/calendars/cal1/entry1': {}
    }

    updateCalendars(message, mockDispatch, mockAccumulators)
    await waitFor(() => expect(getDisplayedCalendarRange).toHaveBeenCalled())
  })

  it('should handle temp calendars', async () => {
    const stateWithTemp = {
      calendars: {
        list: {},
        templist: {
          'temp1/entry1': {
            id: 'temp1/entry1',
            name: 'Temp Calendar',
            syncToken: 1
          }
        }
      }
    }

    ;(store.getState as jest.Mock).mockReturnValue(stateWithTemp)

    const message = {
      '/calendars/temp1/entry1': {}
    }

    updateCalendars(message, mockDispatch, mockAccumulators)

    await waitFor(() =>
      expect(mockRefreshCalendarWithSyncToken).toHaveBeenCalledWith({
        calendar: stateWithTemp.calendars.templist['temp1/entry1'],
        calType: 'temp',
        calendarRange: mockRange
      })
    )
  })

  it('should handle invalid calendar paths gracefully', () => {
    const message = {
      '/invalid/path': {},
      'not-a-path': {}
    }

    updateCalendars(message, mockDispatch, mockAccumulators)

    expect(mockRefreshCalendarWithSyncToken).not.toHaveBeenCalled()
  })

  it('should fall back to getCalendarDetail when calendar has no syncToken', async () => {
    const stateWithoutSyncToken = {
      calendars: {
        list: {
          'cal1/entry1': { id: 'cal1/entry1', name: 'Calendar 1' }
        },
        templist: {}
      }
    } as unknown as RootState

    ;(store.getState as jest.Mock).mockReturnValue(stateWithoutSyncToken)

    const message = {
      '/calendars/cal1/entry1': {}
    }

    updateCalendars(message, mockDispatch, mockAccumulators)

    await waitFor(() => {
      expect(emptyEventsCal).toHaveBeenCalledWith({
        calId: 'cal1/entry1',
        calType: undefined
      })
      expect(getCalendarDetail).toHaveBeenCalledWith({
        calId: 'cal1/entry1',
        match: {
          start: formatDateToYYYYMMDDTHHMMSS(mockRange.start),
          end: formatDateToYYYYMMDDTHHMMSS(mockRange.end)
        },
        calType: undefined
      })
    })

    expect(mockRefreshCalendarWithSyncToken).not.toHaveBeenCalled()
  })
})
