import RegisterCalendars from '@common/components/Calendar/RegisterCalendars'
import * as CalendarDAO from '@common/features/Calendars/CalendarDAO'
import { addCalendarResource } from '@common/features/Calendars/CalendarSlice'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

jest.mock('@common/features/Calendars/CalendarDAO')

jest.mock('@common/features/Calendars/CalendarSlice', () => {
  const calendarSlice = jest.requireActual(
    '@common/features/Calendars/CalendarSlice'
  )
  return {
    __esModule: true,
    ...calendarSlice,
    addCalendarResource: jest.fn()
  }
})

jest.mock('@common/components/Attendees/PeopleSearch', () => ({
  PeopleSearch: ({
    onChange
  }: {
    onChange: (
      event: null,
      value: { displayName: string; openpaasId: string; email?: string }[]
    ) => void
  }) => (
    <div data-testid="people-search">
      <button
        data-testid="mock-resource-search-select"
        onClick={() =>
          onChange(null, [
            {
              displayName: 'Room A',
              openpaasId: 'room-a-id',
              email: 'room-a@test.com'
            },
            {
              displayName: 'Room B',
              openpaasId: 'room-b-id',
              email: 'room-b@test.com'
            }
          ])
        }
      >
        Select Resources
      </button>
    </div>
  )
}))

const mockedFetchCalendars = CalendarDAO.fetchCalendars as jest.Mock
const mockedAddCalendarResource = addCalendarResource as unknown as jest.Mock

describe('RegisterCalendars', () => {
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
    renderWithProviders(
      <RegisterCalendars
        onClose={onClose}
        open={isOpen}
        objectTypes={['resource']}
        onSave={mockedAddCalendarResource as any}
      />,
      {
        user: baseUser
      }
    )
    return { onClose }
  }

  it('renders correctly and closes on cancel', () => {
    const { onClose } = setup()

    expect(
      screen.getByText('calendar.browseOtherCalendars')
    ).toBeInTheDocument()

    const cancelButton = screen.getByRole('button', {
      name: 'common.cancel'
    })
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('does not render when isOpen is false', () => {
    setup(false)
    expect(
      screen.queryByText('calendar.browseOtherCalendars')
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

    mockedFetchCalendars.mockImplementation(userId => {
      if (userId === 'room-a-id') return Promise.resolve(mockCalendarDataA)
      // Simulate failure for room-b
      if (userId === 'room-b-id')
        return Promise.reject(new Error('Failed fetching Room B'))
      return Promise.resolve([])
    })

    const mockDispatchResult = {
      unwrap: () => Promise.resolve({ type: 'success' })
    }
    mockedAddCalendarResource.mockReturnValue(() => mockDispatchResult)

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

    // Click add to trigger addCalendarResource
    await act(async () => {
      fireEvent.click(addButton)
    })

    await waitFor(() => {
      // It should only have been called for Room A because Room B failed (Promise.allSettled)
      expect(mockedAddCalendarResource).toHaveBeenCalledTimes(1)

      const payload = mockedAddCalendarResource.mock.calls[0][0]
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

    mockedFetchCalendars.mockResolvedValueOnce(mockCalendarDataA)
    mockedFetchCalendars.mockResolvedValueOnce([]) // Mock array of size 2 (for both A and B but second resolves empty)

    // Simulate successful API response
    const mockDispatchResult = {
      unwrap: () => Promise.resolve()
    }
    mockedAddCalendarResource.mockReturnValue(() => mockDispatchResult)

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
