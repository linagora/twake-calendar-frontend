import type { Mock } from 'vitest'
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

vi.mock('@common/utils/CalendarRangeManager')

vi.mock('@common/features/Calendars/CalendarSlice', async () => {
  const original = await vi.importActual(
    '@common/features/Calendars/CalendarSlice'
  )
  return {
    ...original,
    emptyEventsCal: vi.fn(args => ({
      type: 'mock/emptyEventsCal',
      payload: args
    })),
    getCalendarDetail: vi.fn(args => ({
      type: 'mock/getCalendarDetail',
      payload: args
    })),
    refreshCalendarWithSyncToken: vi.fn(args => ({
      type: 'mock/refreshCalendarWithSyncToken',
      payload: args
    }))
  }
})

const mockRefreshCalendarWithSyncToken =
  refreshCalendarWithSyncToken as unknown as Mock

vi.mock('@common/app/store', () => ({
  store: {
    getState: vi.fn()
  }
}))

describe('updateCalendars', () => {
  let mockDispatch: Mock
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
    shouldRefreshBookingLinksRef: React.MutableRefObject<boolean>
    currentDebouncePeriod?: number
  } = {
    calendarsToRefresh: new Map<string, any>(),
    calendarsToHide: new Set(),
    debouncedUpdateFns: new Map(),
    shouldRefreshCalendarListRef: { current: false },
    shouldRefreshBookingLinksRef: { current: false },
    currentDebouncePeriod: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDispatch = vi.fn()
    ;(getDisplayedCalendarRange as Mock).mockReturnValue(mockRange)
    ;(store.getState as Mock).mockReturnValue(mockState)
    mockAccumulators.calendarsToRefresh = new Map<string, any>()
    mockAccumulators.calendarsToHide = new Set()
    mockAccumulators.debouncedUpdateFns = new Map()
    mockAccumulators.debouncedListUpdateFn = undefined
    mockAccumulators.currentDebouncePeriod = 0
    mockAccumulators.shouldRefreshCalendarListRef.current = false
    mockAccumulators.shouldRefreshBookingLinksRef.current = false
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

  it("refreshes a delegated calendar notified through the sharee's instance", async () => {
    const delegated = {
      id: 'owner1/cal1',
      name: 'Shared',
      link: '/calendars/sharee1/instance1.json',
      delegated: true,
      syncToken: 1
    }
    ;(store.getState as Mock).mockReturnValue({
      calendars: { list: { [delegated.id]: delegated }, templist: {} }
    })

    updateCalendars(
      { '/calendars/sharee1/instance1': { updated: true } },
      mockDispatch,
      mockAccumulators
    )

    await waitFor(() =>
      expect(mockRefreshCalendarWithSyncToken).toHaveBeenCalledWith({
        calendar: delegated,
        calType: undefined,
        calendarRange: mockRange
      })
    )
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

    ;(store.getState as Mock).mockReturnValue(stateWithTemp)

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

    ;(store.getState as Mock).mockReturnValue(stateWithoutSyncToken)

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

  describe('unregistered calendars', () => {
    const unregisterCal1 = {
      [WS_INBOUND_EVENTS.CLIENT_UNREGISTERED]: ['/calendars/cal1/entry1']
    }

    beforeEach(() => {
      localStorage.setItem(
        'selectedCalendars',
        JSON.stringify(['cal1/entry1', 'cal2/entry2'])
      )
    })

    afterEach(() => {
      localStorage.removeItem('selectedCalendars')
      window.history.pushState({}, '', '/')
    })

    it('hides them from the selection of the full application', () => {
      window.history.pushState({}, '', '/calendar')

      updateCalendars(unregisterCal1, mockDispatch, mockAccumulators)

      expect(
        JSON.parse(localStorage.getItem('selectedCalendars') ?? '[]')
      ).toEqual(['cal2/entry2'])
    })

    it('leaves the selection of the full application untouched on an embed route', () => {
      window.history.pushState({}, '', '/embed/calendars/team1')

      updateCalendars(unregisterCal1, mockDispatch, mockAccumulators)

      expect(
        JSON.parse(localStorage.getItem('selectedCalendars') ?? '[]')
      ).toEqual(['cal1/entry1', 'cal2/entry2'])
    })
  })
})
