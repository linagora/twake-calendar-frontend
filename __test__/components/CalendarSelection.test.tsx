import CalendarSelection from '../../apps/private/src/components/Calendar/CalendarSelection'
import { listBookingLinks } from '@common/features/booking/BookingDao'
import * as calendarThunks from '@common/features/Calendars/CalendarSlice'
import { setTokens } from '@common/features/User/UserSlice'
import '@testing-library/jest-dom'
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/Renderwithproviders'

jest.mock(
  '../../apps/private/src/features/booking/CreateAppointmentModal',
  () => ({
    CreateAppointmentModal: () => null
  })
)

jest.mock('@common/features/booking/BookingDao', () => ({
  listBookingLinks: jest.fn().mockResolvedValue([])
}))

describe('CalendarSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.HIDE_RESOURCES = undefined
    window.BOOKING_LINK_ENABLED = true
    localStorage.clear()
  })
  afterEach(() => {
    window.HIDE_RESOURCES = undefined
    window.BOOKING_LINK_ENABLED = undefined
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

  const calendarsMock = {
    'user1/cal1': {
      name: 'Calendar personal',
      id: 'user1/cal1',
      color: '#FF0000',
      owner: { emails: ['alice@example.com'], lastname: 'alice' }
    },
    'user2/cal1': {
      name: 'Calendar delegated',
      delegated: true,
      id: 'user2/cal1',
      color: '#00FF00',
      owner: {
        firstname: 'Bob',
        lastname: 'Builder',
        emails: ['bob@example.com']
      }
    },
    'user3/cal1': {
      name: 'Calendar shared',
      id: 'user3/cal1',
      color: '#0000FF',
      owner: {
        firstname: 'Charlie',
        lastname: 'Chaplin',
        emails: ['charlie@example.com']
      }
    }
  }
  beforeAll(() => {
    jest.clearAllMocks()
    cleanup()
  })
  it('renders personal, delegated and calendar.other', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={['user1/cal1']}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    expect(screen.getByText('calendar.personal')).toBeInTheDocument()
    expect(screen.getByText('calendar.delegated')).toBeInTheDocument()
    expect(screen.getByText('calendar.other')).toBeInTheDocument()

    expect(
      screen.getByRole('checkbox', { name: 'Calendar personal' })
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Calendar delegated' })
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Calendar shared' })
    ).not.toBeChecked()
  })

  it('does not render resources when HIDE_RESOURCES is true', () => {
    window.HIDE_RESOURCES = true
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={['user1/cal1']}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    expect(screen.queryByText('calendar.resources')).not.toBeInTheDocument()
  })

  it('renders booking links when BOOKING_LINK_ENABLED is true', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    expect(screen.getByText('calendar.bookingLinks')).toBeInTheDocument()
    expect(listBookingLinks).toHaveBeenCalled()
  })

  it('does not fetch booking links before the session is established', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: { ...baseUser, tokens: null },
        calendars: { list: calendarsMock, pending: false }
      }
    )

    expect(listBookingLinks).not.toHaveBeenCalled()
  })

  it('fetches booking links once the session is established', async () => {
    const { store } = renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: { ...baseUser, tokens: null },
        calendars: { list: calendarsMock, pending: false }
      }
    )

    act(() => {
      store.dispatch(setTokens({ accessToken: 'token' }))
    })

    await waitFor(() => expect(listBookingLinks).toHaveBeenCalledTimes(1))
  })

  it.each([[undefined], [false]])(
    'does not render booking links when BOOKING_LINK_ENABLED is %s',
    value => {
      window.BOOKING_LINK_ENABLED = value

      renderWithProviders(
        <CalendarSelection
          selectedCalendars={[]}
          setSelectedCalendars={jest.fn()}
        />,
        {
          user: baseUser,
          calendars: { list: calendarsMock, pending: false }
        }
      )

      expect(
        screen.queryByText('calendar.bookingLinks')
      ).not.toBeInTheDocument()
      expect(listBookingLinks).not.toHaveBeenCalled()
    }
  )

  it('toggles a calendar selection on click', () => {
    const setSelectedCalendars = jest.fn()

    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={setSelectedCalendars}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Calendar personal' })
    fireEvent.click(checkbox)

    expect(setSelectedCalendars).toHaveBeenCalledWith(expect.any(Function))

    const updater = setSelectedCalendars.mock.calls[0][0]
    expect(updater([])).toEqual(['user1/cal1'])
  })

  it('removes calendar from selection if already selected', () => {
    const setSelectedCalendars = jest.fn()

    renderWithProviders(
      <CalendarSelection
        selectedCalendars={['user1/cal1']}
        setSelectedCalendars={setSelectedCalendars}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Calendar personal' })
    fireEvent.click(checkbox)

    const updater = setSelectedCalendars.mock.calls[0][0]
    expect(updater(['user1/cal1'])).toEqual([])
  })

  it('opens CalendarPopover modal when personal Add button is clicked', async () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'tooltip.addPersonalCalendar' })
    )

    await waitFor(() =>
      expect(
        screen.getByText('calendarPopover.tabs.addNew')
      ).toBeInTheDocument()
    )
  })

  it('Navigates to deletion dialog and deletes personal cal', async () => {
    const spy = jest
      .spyOn(calendarThunks, 'removeCalendar')
      .mockImplementation(payload => {
        return () => Promise.resolve(payload) as any
      })
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    const addButtons = screen.getAllByTestId('MoreHorizIcon')
    fireEvent.click(addButtons[0])

    userEvent.click(screen.getByRole('menuitem', { name: /delete/i }))

    await waitFor(() =>
      expect(
        screen.getByText('calendar.delete.title(name=Calendar personal)')
      ).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => expect(spy).toHaveBeenCalled())
  })

  it('Navigates to deletion dialog and deletes other cal', async () => {
    const spy = jest
      .spyOn(calendarThunks, 'removeCalendar')
      .mockImplementation(payload => {
        return () => Promise.resolve(payload) as any
      })
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    const addButtons = screen.getAllByTestId('MoreHorizIcon')
    fireEvent.click(addButtons[1])

    userEvent.click(screen.getByRole('menuitem', { name: /remove/i }))

    await waitFor(() =>
      expect(
        screen.getByText('calendar.delete.removeTitle(name=Calendar delegated)')
      ).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))

    await waitFor(() => expect(spy).toHaveBeenCalled())
  })

  it('Remove dialog of a shared default calendar shows its displayed name', async () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: {
          list: {
            'user3/user3': {
              name: '#default',
              id: 'user3/user3',
              color: '#0000FF',
              owner: {
                firstname: 'Charlie',
                lastname: 'Chaplin',
                emails: ['charlie@example.com']
              }
            }
          },
          pending: false
        }
      }
    )

    fireEvent.click(screen.getAllByTestId('MoreHorizIcon')[0])

    userEvent.click(screen.getByRole('menuitem', { name: /remove/i }))

    await waitFor(() =>
      expect(
        screen.getByText(
          'calendar.delete.removeTitle(name=calendar.defaultCalendarName(name=Charlie Chaplin))'
        )
      ).toBeInTheDocument()
    )
    expect(screen.queryByText(/#default/)).not.toBeInTheDocument()
  })

  it('keeps the add buttons out of the section toggles (#1717)', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    const toggle = screen.getByRole('button', { name: 'calendar.personal' })
    const add = screen.getByRole('button', {
      name: 'tooltip.addPersonalCalendar'
    })
    expect(toggle).toHaveAttribute('aria-expanded')
    expect(toggle).not.toContainElement(add)
    expect(add.tagName).toBe('BUTTON')
  })

  it('opens CalendarSearch modal when Other Add button is clicked', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'tooltip.registerOtherCalendars' })
    )

    expect(
      screen.getByText('calendar.browseOtherCalendars')
    ).toBeInTheDocument()
  })

  it('when only calendar.personal are in the state, only calendar.personal and the title for other to be added are shown', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: {
          list: {
            'user1/cal1': calendarsMock['user1/cal1']
          },
          pending: false
        }
      }
    )

    expect(screen.getByText('calendar.personal')).toBeInTheDocument()
    expect(screen.queryByText('calendar.delegated')).not.toBeInTheDocument()
    expect(screen.queryByText('calendar.other')).toBeInTheDocument()
  })

  it('renders nothing when no calendars are present', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: {}, pending: false }
      }
    )

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('expands and collapses accordions when clicked', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      {
        user: baseUser,
        calendars: { list: calendarsMock, pending: false }
      }
    )
    const delegatedAccordionSummary = screen
      .getByText('calendar.delegated')
      .closest('.MuiAccordionSummary-root')

    fireEvent.click(delegatedAccordionSummary!)
    expect(delegatedAccordionSummary).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(delegatedAccordionSummary!)
    expect(delegatedAccordionSummary).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders owner name caption for non-personal, non-default calendars', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      { user: baseUser, calendars: { list: calendarsMock, pending: false } }
    )
    expect(screen.getByText('Bob Builder')).toBeInTheDocument()
    expect(screen.getByText('Charlie Chaplin')).toBeInTheDocument()
    // personal calendar should NOT show a caption
    expect(screen.queryByText('alice')).not.toBeInTheDocument()
  })

  it('hides team calendar section when user is not in a team calendar', () => {
    renderWithProviders(
      <CalendarSelection
        selectedCalendars={[]}
        setSelectedCalendars={jest.fn()}
      />,
      { user: baseUser, calendars: { list: calendarsMock, pending: false } }
    )
    expect(screen.queryByText('calendar.team')).not.toBeInTheDocument()
  })

  it('renders team calendar section and selects the team calendar', () => {
    const teamCalendarsMock = {
      ...calendarsMock,
      'team1/cal1': {
        name: 'Engineering Team',
        id: 'team1/cal1',
        color: '#FFFF00',
        owner: {
          firstname: 'Dev Team',
          lastname: '',
          emails: [],
          teamCalendar: true
        }
      }
    }

    renderWithProviders(
      <CalendarSelection
        selectedCalendars={['team1/cal1']}
        setSelectedCalendars={jest.fn()}
      />,
      { user: baseUser, calendars: { list: teamCalendarsMock, pending: false } }
    )

    expect(screen.getByText('calendar.team')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Engineering Team' })
    ).toBeChecked()
  })
  describe('booking link row actions', () => {
    const bookingLink = {
      publicId: 'consult-id',
      calendarUrl: '/calendars/user1/cal1.json',
      durationMinutes: 30,
      active: true,
      autoAccept: false,
      name: 'Consult'
    }

    const renderWithBookingLink = async (): Promise<void> => {
      ;(listBookingLinks as jest.Mock).mockResolvedValueOnce([bookingLink])
      renderWithProviders(
        <CalendarSelection
          selectedCalendars={[]}
          setSelectedCalendars={jest.fn()}
        />,
        { user: baseUser, calendars: { list: calendarsMock, pending: false } }
      )
      await screen.findByText('Consult')
    }

    it('names the booking link menu button', async () => {
      await renderWithBookingLink()

      const row = screen.getByText('Consult').closest('li') as HTMLElement
      const moreButton = within(row).getByRole('button', {
        name: 'common.moreOptions'
      })
      fireEvent.click(moreButton)

      expect(await screen.findByRole('menu')).toBeInTheDocument()
    })

    it('keeps row actions visible on screens that cannot hover', async () => {
      await renderWithBookingLink()

      const rules = Array.from(document.styleSheets)
        .flatMap(sheet => Array.from(sheet.cssRules))
        .map(rule => rule.cssText)
      expect(rules).toContainEqual(
        expect.stringMatching(
          /@media \(hover: ?none\)\s*\{[^}]*\.MoreBtn\s*\{\s*opacity:\s*1/
        )
      )
    })
  })
})
