import React from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'
import { AttendeeSearch } from '@common/components/Attendees/AttendeeSearch'
import { userAttendee } from '@common/features/User/models/attendee'
import * as useFreeBusyModule from '@common/components/Attendees/useFreeBusy'
import * as UserDao from '@common/features/User/UserDao'
import * as FreeBusyApi from '@common/features/Events/FreeBusyApi'

vi.mock('@common/components/Attendees/PeopleSearch', () => ({
  PeopleSearch: ({
    selectedUsers,
    getChipIcon,
    onChange
  }: {
    selectedUsers: Array<{
      email: string
      displayName: string
      objectType?: string
      openpaasId?: string
    }>
    getChipIcon: (user: {
      email: string
      displayName: string
    }) => React.ReactNode
    onChange: (
      event: React.SyntheticEvent,
      value: Array<{
        email: string
        displayName: string
        objectType?: string
        openpaasId?: string
      }>
    ) => void
  }) => (
    <div>
      {selectedUsers.map(user => (
        <div key={user.email} data-testid={`chip-${user.email}`}>
          <span>{user.displayName || user.email}</span>
          {getChipIcon(user)}
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({} as React.SyntheticEvent, [
            ...selectedUsers,
            {
              email: 'contact@external.com',
              displayName: 'External Contact',
              objectType: 'contact'
            }
          ])
        }
      >
        Add contact
      </button>
    </div>
  )
}))

const internalAttendeeEmail = 'hphan@linagora.com'

function renderAttendeeSearch(...attendeeEmails: string[]): void {
  const attendees = attendeeEmails.map(
    email =>
      new userAttendee({
        cal_address: email,
        cn: email,
        rsvp: 'TRUE'
      })
  )

  renderWithProviders(
    <AttendeeSearch
      attendees={attendees}
      setAttendees={vi.fn()}
      start="2026-03-14T14:00:00"
      end="2026-03-14T15:00:00"
      timezone="Europe/Paris"
    />
  )
}

describe('AttendeeSearch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('checks free/busy for prefilled attendees on a new event instead of marking them as contact', () => {
    const useAttendeesFreeBusySpy = vi
      .spyOn(useFreeBusyModule, 'useAttendeesFreeBusy')
      .mockReturnValue({ [internalAttendeeEmail]: 'free' })

    renderAttendeeSearch(internalAttendeeEmail)

    expect(useAttendeesFreeBusySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        existingAttendees: [],
        newAttendees: [{ email: internalAttendeeEmail, userId: null }],
        enabled: true
      })
    )

    expect(
      screen.queryByTestId('HelpOutlineOutlinedIcon')
    ).not.toBeInTheDocument()
  })

  it('marks explicit contacts as contact without fetching free/busy', () => {
    const useAttendeesFreeBusySpy = vi
      .spyOn(useFreeBusyModule, 'useAttendeesFreeBusy')
      .mockReturnValue({})

    renderAttendeeSearch()

    fireEvent.click(screen.getByText('Add contact'))

    const lastCall = useAttendeesFreeBusySpy.mock.calls.at(-1)?.[0]
    expect(lastCall?.newAttendees).toEqual([])
    expect(screen.getByTestId('HelpOutlineOutlinedIcon')).toBeInTheDocument()
  })

  it.each([
    { status: 'busy', hasConflict: true },
    { status: 'free', hasConflict: false }
  ])('resolves a prefilled attendee as $status', async ({ hasConflict }) => {
    vi.spyOn(UserDao, 'fetchUserByEmail').mockResolvedValue([
      { _id: 'user-hphan' }
    ])
    const freeBusyResponse = Promise.resolve(hasConflict)
    const getFreeBusy = vi
      .spyOn(FreeBusyApi, 'getFreeBusyForAddedAttendee')
      .mockReturnValue(freeBusyResponse)

    renderAttendeeSearch(internalAttendeeEmail)
    await act(() => freeBusyResponse)

    expect(getFreeBusy).toHaveBeenCalledWith(
      'user-hphan',
      '20260314T130000',
      '20260314T140000'
    )

    const busyIcon = screen.queryByTestId('AccessTimeFilledIcon')
    expect(busyIcon !== null).toBe(hasConflict)
    expect(
      screen.queryByTestId('HelpOutlineOutlinedIcon')
    ).not.toBeInTheDocument()
  })

  it('resolves prefilled attendee as unknown when email is not an internal user', async () => {
    vi.spyOn(UserDao, 'fetchUserByEmail').mockResolvedValue([])

    renderAttendeeSearch('external@example.com')

    await waitFor(() => {
      expect(screen.getByTestId('HelpOutlineOutlinedIcon')).toBeInTheDocument()
    })
  })
})
