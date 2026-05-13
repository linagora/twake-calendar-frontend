import EventPopover from '@/features/Events/EventModal'
import { DateSelectArg } from '@fullcalendar/core'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

describe('EventPopover', () => {
  beforeEach(() => {
    window.HIDE_RESOURCES = undefined
    sessionStorage.clear()
  })
  afterEach(() => {
    window.HIDE_RESOURCES = undefined
  })
  const mockOnClose = jest.fn()
  const mockSetSelectedRange = jest.fn()
  const mockCalendarRef = { current: { select: jest.fn() } } as any

  const preloadedState = {
    user: {
      userData: {
        sub: 'test',
        email: 'test@test.com',
        sid: 'aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro',
        openpaasId: '667037022b752d0026472254'
      },
      organiserData: {
        cn: 'test',
        cal_address: 'test@test.com'
      }
    },
    calendars: {
      list: {
        '667037022b752d0026472254/cal1': {
          id: '667037022b752d0026472254/cal1',
          name: 'Calendar 1',
          color: '#FF0000'
        }
      },
      pending: false
    }
  }

  const defaultSelectedRange = {
    startStr: '2025-07-18T09:00',
    endStr: '2025-07-18T10:00',
    start: new Date('2025-07-18T09:00'),
    end: new Date('2025-07-18T10:00'),
    allDay: false,
    resource: undefined
  } as unknown as DateSelectArg

  const renderPopover = (selectedRange = defaultSelectedRange) => {
    renderWithProviders(
      <EventPopover
        open={true}
        onClose={mockOnClose}
        selectedRange={selectedRange}
        setSelectedRange={mockSetSelectedRange}
        calendarRef={mockCalendarRef}
      />,
      preloadedState
    )
  }

  it('hides resources when HIDE_RESOURCES=true', async () => {
    window.HIDE_RESOURCES = true
    renderPopover()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'common.moreOptions'
      })
    )
    expect(
      screen.queryByPlaceholderText('resourceSearch.placeholder')
    ).not.toBeInTheDocument()
  })
})
