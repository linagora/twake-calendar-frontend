import { calendarAction } from '@common/features/Calendars/CalendarDAO'
import { addCalendarResource } from '@common/features/Calendars/CalendarSlice'
import { fetchOwnerOfResource } from '@common/features/Calendars/services/helpers'
import { toRejectedError } from '@common/utils/errorUtils'
import { configureStore } from '@reduxjs/toolkit'

jest.mock('@common/features/Calendars/CalendarDAO')
jest.mock('@common/features/Calendars/services/helpers')
jest.mock('@common/utils/errorUtils')

const mockedCalendarAction = calendarAction as jest.Mock
const mockedFetchOwnerOfResource = fetchOwnerOfResource as jest.Mock
const mockedToRejectedError = toRejectedError as jest.Mock

describe('addCalendarResource thunk', () => {
  let store: ReturnType<typeof configureStore>
  const dispatch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    store = configureStore({
      reducer: () => ({})
    })
  })

  const mockPayload = {
    userId: 'user-123',
    calId: 'cal-123',
    cal: {
      color: {
        background: '#000000',
        foreground: '#FFFFFF'
      },
      cal: {
        'dav:name': 'Resource Room A',
        'caldav:description': 'A meeting room',
        _links: {
          self: {
            href: '/calendars/res-456/cal-123.json'
          }
        }
      }
    }
  }

  const mockResolvedResourceData = {
    _id: 'res-456',
    id: 'res-456',
    name: 'Resource Room A',
    description: 'A meeting room',
    creator: 'user-789',
    deleted: false,
    _rev: '1'
  }

  it('should add shared calendar, fetch resource details, map userData', async () => {
    mockedFetchOwnerOfResource.mockResolvedValueOnce({
      firstname: 'Creator',
      lastname: 'User',
      emails: ['creator@example.com']
    })
    mockedCalendarAction.mockResolvedValueOnce({ ok: true })

    const result = await addCalendarResource(
      mockPayload as unknown as Parameters<typeof addCalendarResource>[0]
    )(dispatch, store.getState, undefined)

    expect(mockedCalendarAction).toHaveBeenCalledWith(
      'POST',
      `/calendars/${mockPayload.userId}.json`,
      expect.any(String)
    )
    expect(mockedFetchOwnerOfResource).toHaveBeenCalledWith('res-456')

    expect(result.type).toBe('calendars/addCalendarResource/fulfilled')
    expect(result.payload).toEqual({
      calId: 'res-456/cal-123',
      color: { background: '#000000', foreground: '#FFFFFF' },
      desc: 'A meeting room',
      link: '/calendars/user-123/cal-123.json',
      name: 'Resource Room A',
      owner: {
        firstname: 'Creator',
        lastname: 'User',
        emails: ['creator@example.com'],
        resource: true
      }
    })
  })

  it('should fallback to name if resource details fetch fails', async () => {
    mockedCalendarAction.mockResolvedValueOnce({ ok: true })
    const errorDetails = new Error('Fetch failed')
    mockedFetchOwnerOfResource.mockRejectedValueOnce(errorDetails)

    // Silence expected console error in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await addCalendarResource(
      mockPayload as unknown as Parameters<typeof addCalendarResource>[0]
    )(dispatch, store.getState, undefined)

    expect(mockedCalendarAction).toHaveBeenCalledWith(
      'POST',
      `/calendars/${mockPayload.userId}.json`,
      expect.any(String)
    )
    expect(mockedFetchOwnerOfResource).toHaveBeenCalledWith('res-456')

    consoleSpy.mockRestore()

    expect(result.type).toBe('calendars/addCalendarResource/fulfilled')
    expect(result.payload).toEqual({
      calId: 'res-456/cal-123',
      color: { background: '#000000', foreground: '#FFFFFF' },
      desc: 'A meeting room',
      link: '/calendars/user-123/cal-123.json',
      name: 'Resource Room A',
      owner: {
        firstname: '',
        lastname: 'Resource Room A',
        emails: [],
        resource: true
      }
    })
  })

  it('should handle error if calendarAction fails', async () => {
    const errorAdd = new Error('Add failed')
    mockedCalendarAction.mockRejectedValueOnce(errorAdd)
    const mockRejectedErrorResult = { message: 'Add failed' }
    mockedToRejectedError.mockReturnValueOnce(mockRejectedErrorResult)

    const result = await addCalendarResource(
      mockPayload as unknown as Parameters<typeof addCalendarResource>[0]
    )(dispatch, store.getState, undefined)

    expect(mockedCalendarAction).toHaveBeenCalledWith(
      'POST',
      `/calendars/${mockPayload.userId}.json`,
      expect.any(String)
    )
    expect(mockedFetchOwnerOfResource).not.toHaveBeenCalled()

    expect(mockedToRejectedError).toHaveBeenCalledWith(errorAdd)

    expect(result.type).toBe('calendars/addCalendarResource/rejected')
    expect(result.payload).toEqual(mockRejectedErrorResult)
  })
})
