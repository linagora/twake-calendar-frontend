import React from 'react'
import { fireEvent, screen, act, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'
import { AttendeePopover } from '@common/components/Attendees/AttendeePopover'
import { userAttendee } from '@common/features/User/models/attendee'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { searchPeople } from '@common/features/User/UserDao'

jest.mock('@common/features/User/UserDao')
const mockedSearchPeople = searchPeople as jest.MockedFunction<
  typeof searchPeople
>

jest.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: jest.fn(() => ({
    isTooSmall: false,
    isTablet: false
  }))
}))

describe('AttendeePopover (Private)', () => {
  beforeEach(() => {
    window.MAIL_SPA_URL = 'https://mail.example.com'
  })

  it('uses private AttendeeActions implementation with chat and create event actions', () => {
    const attendee = new userAttendee({
      cal_address: 'john@example.com',
      cn: 'John Doe'
    })

    renderWithProviders(
      <AttendeePopover attendee={attendee}>
        <span>Open Popover</span>
      </AttendeePopover>,
      {
        user: {
          userData: {
            email: 'user@example.com',
            workplaceFqdn: 'example.com'
          }
        }
      }
    )

    const trigger = screen.getByText('Open Popover')
    fireEvent.click(trigger)

    // Should render mail action button
    expect(screen.getByText('ContactPopover.emailButton')).toBeInTheDocument()

    // Should render create event action button present in private AttendeeActions
    expect(
      screen.getByRole('button', {
        name: 'tooltip.createEventWithAttendee(attendee=John Doe)'
      })
    ).toBeInTheDocument()
  })

  it('names its close and chat buttons', async () => {
    window.CHAT_SPA_URL = 'https://chat.example.com'
    mockedSearchPeople.mockResolvedValue([{ email: 'john@example.com' }])
    try {
      const attendee = new userAttendee({
        cal_address: 'john@example.com',
        cn: 'John Doe'
      })

      renderWithProviders(
        <AttendeePopover attendee={attendee}>
          <span>Open Popover</span>
        </AttendeePopover>,
        {
          user: {
            userData: {
              email: 'user@example.com',
              workplaceFqdn: 'example.com'
            }
          }
        }
      )
      fireEvent.click(screen.getByText('Open Popover'))

      expect(
        screen.getByRole('button', { name: 'ContactPopover.closeButton' })
      ).toBeInTheDocument()
      expect(
        await screen.findByRole('link', {
          name: 'tooltip.openChat(attendee=John Doe)'
        })
      ).not.toHaveAttribute('aria-disabled')
    } finally {
      window.CHAT_SPA_URL = undefined
    }
  })

  it('opens popover after pending hover delay on mouse enter and closes on mouse leave', () => {
    jest.useFakeTimers()
    const attendee = new userAttendee({
      cal_address: 'john@example.com',
      cn: 'John Doe'
    })

    renderWithProviders(
      <AttendeePopover attendee={attendee}>
        <span>Open Popover</span>
      </AttendeePopover>,
      {
        user: {
          userData: {
            email: 'user@example.com',
            workplaceFqdn: 'example.com'
          }
        }
      }
    )

    const trigger = screen.getByText('Open Popover')
    expect(
      screen.queryByText('ContactPopover.emailButton')
    ).not.toBeInTheDocument()

    // Mouse enter on trigger
    fireEvent.mouseEnter(trigger)
    // Not open yet before pending time delay
    expect(
      screen.queryByText('ContactPopover.emailButton')
    ).not.toBeInTheDocument()

    // Fast-forward open timer
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(screen.getByText('ContactPopover.emailButton')).toBeInTheDocument()

    // Leaving the trigger keeps the open card, leaving the card closes it
    fireEvent.mouseLeave(trigger)
    act(() => {
      jest.advanceTimersByTime(200)
    })
    expect(screen.getByText('ContactPopover.emailButton')).toBeInTheDocument()

    fireEvent.mouseLeave(
      screen.getByText('ContactPopover.emailButton').closest('.MuiPaper-root')!
    )
    // Still open before close timer runs
    expect(screen.getByText('ContactPopover.emailButton')).toBeInTheDocument()

    // Fast-forward close timer
    act(() => {
      jest.advanceTimersByTime(200)
    })
    // Let the popover's exit transition finish
    act(() => {
      jest.runOnlyPendingTimers()
    })
    expect(
      screen.queryByText('ContactPopover.emailButton')
    ).not.toBeInTheDocument()

    jest.useRealTimers()
  })

  it('does not open popover on hover when openOnHover is false but opens on click', () => {
    jest.useFakeTimers()
    const attendee = new userAttendee({
      cal_address: 'john@example.com',
      cn: 'John Doe'
    })

    renderWithProviders(
      <AttendeePopover attendee={attendee} openOnHover={false}>
        <span>Open Popover</span>
      </AttendeePopover>,
      {
        user: {
          userData: {
            email: 'user@example.com',
            workplaceFqdn: 'example.com'
          }
        }
      }
    )

    const trigger = screen.getByText('Open Popover')

    fireEvent.mouseEnter(trigger)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(
      screen.queryByText('ContactPopover.emailButton')
    ).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByText('ContactPopover.emailButton')).toBeInTheDocument()

    fireEvent.mouseLeave(trigger)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(screen.getByText('ContactPopover.emailButton')).toBeInTheDocument()

    jest.useRealTimers()
  })
})
