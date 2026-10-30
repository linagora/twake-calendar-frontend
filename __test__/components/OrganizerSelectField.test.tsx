import type { Mock } from 'vitest'
import { OrganizerSelectField } from '@common/components/Event/fields/OrganizerSelectField'
import { fetchUserById } from '@common/features/User/UserDao'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@common/features/User/UserDao', () => ({
  fetchUserById: vi.fn()
}))

vi.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => (key === 'event.organizer' ? 'Organizer' : key)
  })
}))

describe('OrganizerSelectField', () => {
  const currentUserOrganizer = new userOrganiser({
    cn: 'Current User',
    cal_address: 'mailto:current@example.com'
  })

  const teamCalendar: Calendar = {
    id: 'team/cal1',
    link: 'team/cal1.json',
    name: 'Engineers Team',
    owner: {
      firstname: 'Engineers Team',
      emails: ['team@example.com'],
      teamCalendar: true
    },
    events: {},
    visibility: 'public',
    invite: [
      {
        href: 'mailto:alice@example.com',
        principal: '/principals/users/user-alice',
        access: 3, // EDITOR (write access)
        inviteStatus: 1
      },
      {
        href: 'mailto:bob@example.com',
        principal: '/principals/users/user-bob',
        access: 2, // VIEW (read access only - should be excluded)
        inviteStatus: 1
      },
      {
        href: 'mailto:charlie@example.com',
        principal: '/principals/users/user-charlie',
        access: 5, // ADMIN (write access)
        inviteStatus: 1
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetchUserById as Mock).mockImplementation((id: string) => {
      if (id === 'user-alice') {
        return Promise.resolve({
          firstname: 'Alice',
          lastname: 'Smith',
          preferredEmail: 'alice@example.com',
          emails: ['alice@example.com']
        })
      }
      if (id === 'user-charlie') {
        return Promise.resolve({
          firstname: 'Charlie',
          lastname: 'Brown',
          preferredEmail: 'charlie@example.com',
          emails: ['charlie@example.com']
        })
      }
      return Promise.resolve(null)
    })
  })

  it('renders current user as default value and loads write access users', async () => {
    const handleChange = vi.fn()

    render(
      <OrganizerSelectField
        calendar={teamCalendar}
        value={currentUserOrganizer}
        onChange={handleChange}
        userOrganizer={currentUserOrganizer}
        showMore={true}
      />
    )

    // Current user should be displayed in the select input by default
    expect(screen.getByRole('combobox')).toHaveTextContent('Current User')

    // Click select to open options
    fireEvent.mouseDown(screen.getByRole('combobox'))

    await waitFor(() => {
      expect(fetchUserById).toHaveBeenCalledWith('user-alice')
      expect(fetchUserById).toHaveBeenCalledWith('user-charlie')
      expect(fetchUserById).not.toHaveBeenCalledWith('user-bob')
    })

    // Verify option items in dropdown
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument()
      expect(screen.getByText(/Charlie Brown/i)).toBeInTheDocument()
    })
  })

  it('invokes onChange when a different organizer is selected', async () => {
    const handleChange = vi.fn()

    render(
      <OrganizerSelectField
        calendar={teamCalendar}
        value={currentUserOrganizer}
        onChange={handleChange}
        userOrganizer={currentUserOrganizer}
        showMore={true}
      />
    )

    // Open dropdown
    fireEvent.mouseDown(screen.getByRole('combobox'))

    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument()
    })

    // Click Alice Smith option
    fireEvent.click(screen.getByText(/Alice Smith/i))

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        cn: 'Alice Smith',
        cal_address: 'mailto:alice@example.com'
      })
    )
  })
})
