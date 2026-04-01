import CalendarResources from '@/components/Calendar/CalendarResources'
import { getCalendars } from '@/features/Calendars/CalendarApi'
import { addCalendarResourceAsync } from '@/features/Calendars/api/addCalendarResourceAsync'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

jest.mock('@/features/Calendars/CalendarApi')
jest.mock('@/features/Calendars/api/addCalendarResourceAsync')
jest.mock('@/components/Attendees/ResourceSearch', () => ({
  ResourceSearch: ({
    onChange
  }: {
    onChange: (
      event: null,
      value: { displayName: string; openpaasId: string }[]
    ) => void
  }) => (
    <div data-testid="resource-search">
      <button
        data-testid="mock-resource-search-select"
        onClick={() =>
          onChange(null, [
            { displayName: 'Room A', openpaasId: 'room-a-id' },
            { displayName: 'Room B', openpaasId: 'room-b-id' }
          ])
        }
      >
        Select Resources
      </button>
    </div>
  )
}))

const mockedGetCalendars = getCalendars as jest.Mock
const mockedAddCalendarResourceAsync =
  addCalendarResourceAsync as unknown as jest.Mock

describe('CalendarResources', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const baseUser = {
    userData: {
      sub: 'test',
      email: 'test@test.com',
      sid: 'mockSid',
      openpaasId: 'user1'
    },
    tokens: { accessToken: 'token' }
  }

  const setup = (isOpen = true) => {
    const onClose = jest.fn()
    renderWithProviders(<CalendarResources onClose={onClose} open={isOpen} />, {
      user: baseUser
    })
    return { onClose }
  }

  it('renders correctly and closes on cancel', () => {
    const { onClose } = setup()

    expect(screen.getByText('calendar.browseResources')).toBeInTheDocument()

    const cancelButton = screen.getByRole('button', {
      name: 'common.cancel'
    })
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('does not render when isOpen is false', () => {
    setup(false)
    expect(
      screen.queryByText('calendar.browseResources')
    ).not.toBeInTheDocument()
  })

  it('fetches resource calendars and adds them using Promise.allSettled logic', async () => {
    const mockCalendarDataA = {
      _embedded: {
        'dav:calendar': [
          {
            _links: { self: { href: '/calendars/room-a-id/cal-a.json' } },
            'dav:name': 'Room A Calendar',
            'caldav:description': 'Main room A calendar',
            color: 'red'
          }
        ]
      }
    }

    mockedGetCalendars.mockImplementation(userId => {
      if (userId === 'room-a-id') return Promise.resolve(mockCalendarDataA)
      // Simulate failure for room-b
      if (userId === 'room-b-id')
        return Promise.reject(new Error('Failed fetching Room B'))
      return Promise.resolve([])
    })

    const mockDispatchResult = {
      unwrap: () => Promise.resolve({ type: 'success' })
    }
    mockedAddCalendarResourceAsync.mockReturnValue(() => mockDispatchResult)

    const { onClose } = setup()

    // Trigger resource selection
    const mockSelectBtn = screen.getByTestId('mock-resource-search-select')
    await act(async () => {
      fireEvent.click(mockSelectBtn)
    })

    // After selection, the button should be enabled and say Add
    const addButton = await screen.findByRole('button', {
      name: 'actions.add'
    })
    expect(addButton).not.toBeDisabled()

    // Click add to trigger addCalendarResourceAsync
    await act(async () => {
      fireEvent.click(addButton)
    })

    await waitFor(() => {
      // It should only have been called for Room A because Room B failed (Promise.allSettled)
      expect(mockedAddCalendarResourceAsync).toHaveBeenCalledTimes(1)

      const payload = mockedAddCalendarResourceAsync.mock.calls[0][0]
      expect(payload).toEqual(
        expect.objectContaining({
          userId: 'user1',
          calId: expect.any(String),
          cal: expect.objectContaining({
            cal: mockCalendarDataA._embedded['dav:calendar'][0]
          })
        })
      )
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('adds existing user details fallback logic within submit handler', async () => {
    const mockCalendarDataA = {
      _embedded: {
        'dav:calendar': [
          {
            _links: { self: { href: '/calendars/room-a-id/cal-a.json' } },
            'dav:name': 'Room A Calendar',
            'caldav:description': 'Main room A calendar',
            color: 'red'
          }
        ]
      }
    }

    mockedGetCalendars.mockResolvedValueOnce(mockCalendarDataA)
    mockedGetCalendars.mockResolvedValueOnce([]) // Mock array of size 2 (for both A and B but second resolves empty)

    // Simulate successful API response
    const mockDispatchResult = {
      unwrap: () => Promise.resolve()
    }
    mockedAddCalendarResourceAsync.mockReturnValue(() => mockDispatchResult)

    const { onClose } = setup()

    // Trigger resource selection
    const mockSelectBtn = screen.getByTestId('mock-resource-search-select')
    await act(async () => {
      fireEvent.click(mockSelectBtn)
    })

    const addButton = await screen.findByRole('button', {
      name: 'actions.add'
    })
    await act(async () => {
      fireEvent.click(addButton)
    })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
})
