import React from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'
import { AttendeePopover } from '@common/components/Attendees/AttendeePopover'
import { userAttendee } from '@common/features/User/models/attendee'

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
    expect(screen.getByText('attendees.sendMail')).toBeInTheDocument()

    // Should render create event action button present in private AttendeeActions
    expect(
      screen.getByLabelText(
        'tooltip.createEventWithAttendee(attendee=John Doe)'
      )
    ).toBeInTheDocument()
  })
})
