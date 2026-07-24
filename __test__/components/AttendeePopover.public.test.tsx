import React from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'
import { AttendeePopover } from '@common/components/Attendees/AttendeePopover'
import { userAttendee } from '@common/features/User/models/attendee'

describe('AttendeePopover (Public)', () => {
  beforeEach(() => {
    window.MAIL_SPA_URL = 'https://mail.example.com'
  })

  it('uses public mail-only AttendeeActions implementation', () => {
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
    expect(screen.getByText('attendees.sendMail')).toBeInTheDocument()

    // Should NOT render chat or create event buttons present only in private AttendeeActions
    expect(screen.queryByText(/tooltip\.openChat/)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/tooltip\.createEventWithAttendee/)
    ).not.toBeInTheDocument()
  })
})
