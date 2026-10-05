import CalendarPopover from '@common/components/Calendar/CalendarModal'
import { fetchSecretLink } from '@common/features/Calendars/CalendarDAO'
import * as eventThunks from '@common/features/Calendars/CalendarSlice'
import { Calendar } from '@common/types/CalendarTypes'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/Renderwithproviders'

jest.mock('@common/features/Calendars/CalendarDAO', () => ({
  fetchSecretLink: jest.fn()
}))

const mockThunkWithUnwrap = (resolvedValue: unknown = {}) =>
  jest.fn().mockImplementation(() => {
    const dispatchResult = Object.assign(Promise.resolve(resolvedValue), {
      unwrap: () => Promise.resolve(resolvedValue)
    })
    return jest.fn().mockReturnValue(dispatchResult)
  })

describe('CalendarPopover', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .spyOn(eventThunks, 'updateDelegationCalendar')
      .mockImplementation(mockThunkWithUnwrap())
  })

  const renderPopover = (open = true) => {
    const preloadedState = {
      user: {
        userData: {
          sub: 'test',
          email: 'test@test.com',
          sid: 'aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro',
          openpaasId: '667037022b752d0026472254'
        }
      },
      calendars: { list: {}, pending: true }
    }
    renderWithProviders(
      <CalendarPopover open={open} onClose={mockOnClose} />,
      preloadedState
    )
  }

  it('renders popover and inputs', () => {
    renderPopover()

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
    expect(screen.getByText('event.form.addDescription')).toBeInTheDocument()
  })

  it('updates name and description fields', () => {
    renderPopover()

    const nameInput = screen.getByLabelText(/Name/i)
    fireEvent.change(nameInput, { target: { value: 'My Calendar' } })
    expect(nameInput).toHaveValue('My Calendar')

    fireEvent.click(screen.getByText('event.form.addDescription'))
    const descInput = screen.getByLabelText(/Description/i)
    fireEvent.change(descInput, { target: { value: 'Test description' } })
    expect(descInput).toHaveValue('Test description')
  })

  it('dispatches createCalendarAsync and calls onClose when Save clicked', async () => {
    jest
      .spyOn(eventThunks, 'createCalendarAsync')
      .mockImplementation(mockThunkWithUnwrap())

    renderPopover()

    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: 'Test Calendar' }
    })
    fireEvent.click(screen.getByText('event.form.addDescription'))
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'Test Description' }
    })

    const colorButtons = screen.getAllByRole('radio', {
      name: /colorPicker.colors/
    })
    fireEvent.click(colorButtons[0])

    fireEvent.click(screen.getByRole('button', { name: /Create/i }))

    await waitFor(() =>
      expect(eventThunks.createCalendarAsync).toHaveBeenCalled()
    )
    await waitFor(() =>
      expect(mockOnClose).toHaveBeenCalledWith({}, 'backdropClick')
    )
  })

  it('calls onClose when Cancel clicked', () => {
    renderPopover()

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(mockOnClose).toHaveBeenCalledWith({}, 'backdropClick')
  })
})

describe('CalendarPopover (editing mode)', () => {
  const mockOnClose = jest.fn()

  const baseUser = {
    userData: {
      sub: 'test',
      email: 'test@test.com',
      sid: 'mockSid',
      openpaasId: 'user1'
    }
  }

  const existingCalendar: Calendar = {
    id: 'user1/cal1',
    link: '/calendars/user/cal1',
    name: 'Work Calendar',
    description: 'Team meetings',
    color: { light: '#33B679' },
    owner: { firstname: 'alice', emails: ['alice@example.com'] },
    visibility: 'public',
    events: {}
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .spyOn(eventThunks, 'updateDelegationCalendar')
      .mockImplementation(mockThunkWithUnwrap())
  })

  it('prefills fields when calendar prop is given', () => {
    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    )

    expect(screen.getByLabelText(/Name/i)).toHaveValue('Work Calendar')
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Team meetings')
  })

  test('Save button is disabled when name is empty or whitespace only', () => {
    renderWithProviders(<CalendarPopover open={true} onClose={jest.fn()} />, {
      user: baseUser
    })

    const saveButton = screen.getByRole('button', { name: /create/i })
    expect(saveButton).toBeDisabled()
    // only spaces
    const nameInput = screen.getByLabelText(/name/i)
    fireEvent.change(nameInput, { target: { value: '    ' } })

    expect(saveButton).toBeDisabled()

    // valid name
    fireEvent.change(nameInput, { target: { value: 'Work Calendar' } })
    expect(saveButton).toBeEnabled()
  })

  it('allows modifying and saving existing calendar', async () => {
    jest
      .spyOn(eventThunks, 'patchCalendar')
      .mockImplementation(mockThunkWithUnwrap())

    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    )

    // Change name
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: 'Updated Calendar' }
    })

    // Save
    fireEvent.click(screen.getByRole('button', { name: 'actions.save' }))

    await waitFor(() =>
      expect(eventThunks.patchCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          calId: 'user1/cal1',
          calLink: '/calendars/user/cal1',
          patch: {
            color: { light: '#33B679' },
            desc: 'Team meetings',
            name: 'Updated Calendar'
          }
        })
      )
    )
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled())
  })

  describe('default calendar', () => {
    const defaultCalendar: Calendar = {
      ...existingCalendar,
      name: '#default'
    }

    const renderDefaultCalendar = () =>
      renderWithProviders(
        <CalendarPopover
          open={true}
          onClose={mockOnClose}
          calendar={defaultCalendar}
        />,
        { user: baseUser }
      )

    beforeEach(() => {
      jest
        .spyOn(eventThunks, 'patchCalendar')
        .mockImplementation(mockThunkWithUnwrap())
    })

    it('shows the display name instead of the internal #default name', () => {
      renderDefaultCalendar()

      expect(screen.getByLabelText(/Name/i)).toHaveValue(
        'calendar.defaultPersonalCalendarName'
      )
    })

    it('keeps #default when other fields are changed', async () => {
      renderDefaultCalendar()

      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: 'Updated description' }
      })
      fireEvent.click(screen.getByRole('button', { name: 'actions.save' }))

      await waitFor(() =>
        expect(eventThunks.patchCalendar).toHaveBeenCalledWith(
          expect.objectContaining({
            patch: {
              color: { light: '#33B679' },
              desc: 'Updated description',
              name: '#default'
            }
          })
        )
      )
    })

    it('does not patch the calendar when nothing changed', async () => {
      renderDefaultCalendar()

      fireEvent.click(screen.getByRole('button', { name: 'actions.save' }))

      await waitFor(() => expect(mockOnClose).toHaveBeenCalled())
      expect(eventThunks.patchCalendar).not.toHaveBeenCalled()
    })

    it('saves the new name when the user renames it', async () => {
      renderDefaultCalendar()

      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'Personal' }
      })
      fireEvent.click(screen.getByRole('button', { name: 'actions.save' }))

      await waitFor(() =>
        expect(eventThunks.patchCalendar).toHaveBeenCalledWith(
          expect.objectContaining({
            patch: expect.objectContaining({ name: 'Personal' })
          })
        )
      )
    })
  })

  it('shows access tab when modifying a team calendar, but hides input to invite user to a member without the administration right', () => {
    const teamCalendar: Calendar = {
      ...existingCalendar,
      id: 'team1/cal1',
      link: '/calendars/user1/instance1.json',
      delegated: true,
      owner: { firstname: 'Engineering Team', emails: [], teamCalendar: true }
    }

    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={teamCalendar}
      />,
      { user: baseUser }
    )

    expect(
      screen.getByText('calendarPopover.tabs.settings')
    ).toBeInTheDocument()
    const accessTab = screen.getByText('calendarPopover.tabs.access')
    expect(accessTab).toBeInTheDocument()

    fireEvent.click(accessTab)
    expect(
      screen.queryByPlaceholderText('peopleSearch.label')
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('calendarPopover.access.accessRights')
    ).toBeInTheDocument()
  })
})

describe('CalendarPopover - Tabs Scenarios', () => {
  const mockOnClose = jest.fn()
  const baseUser = {
    userData: {
      openpaasId: 'user1'
    }
  }

  const writeText = jest.fn()

  Object.assign(navigator, {
    clipboard: {
      writeText
    }
  })

  const existingCalendar: Calendar = {
    id: 'user1/cal1',
    link: '/calendars/user1/cal1.json',
    name: 'Work Calendar',
    description: 'Team meetings',
    color: { light: '#33B679' },
    owner: { firstname: 'alice', emails: ['alice@example.com'] },
    visibility: 'public',
    events: {}
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .spyOn(eventThunks, 'updateDelegationCalendar')
      .mockImplementation(mockThunkWithUnwrap())
  })

  it('resets state after closing and reopening', () => {
    const { rerender } = renderWithProviders(
      <CalendarPopover open={true} onClose={mockOnClose} />,
      { user: baseUser }
    )

    // Enter some data
    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: 'Temp Calendar' }
    })
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(mockOnClose).toHaveBeenCalled()

    // Reopen: state should be reset
    rerender(<CalendarPopover open={true} onClose={mockOnClose} />)
    expect(screen.getByLabelText(/Name/i)).toHaveValue('')
  })

  it('shows Access tab only when editing an existing calendar', () => {
    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    )

    expect(screen.getByRole('tab', { name: /Access/i })).toBeInTheDocument()
  })

  it('does not show Access tab when creating new calendar', () => {
    renderWithProviders(<CalendarPopover open={true} onClose={mockOnClose} />, {
      user: baseUser
    })

    expect(
      screen.queryByRole('tab', { name: /Access/i })
    ).not.toBeInTheDocument()
  })

  it('patches ACL when visibility changes', async () => {
    jest
      .spyOn(eventThunks, 'patchCalendar')
      .mockImplementation(mockThunkWithUnwrap())

    jest
      .spyOn(eventThunks, 'patchACLCalendar')
      .mockImplementation(mockThunkWithUnwrap())

    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    )

    // By default: "All" (public) is selected
    const publicButton = screen.getByRole('button', { name: /All/i })
    const privateButton = screen.getByRole('button', { name: /You/i })

    expect(publicButton).toHaveAttribute('aria-pressed', 'true')
    expect(privateButton).toHaveAttribute('aria-pressed', 'false')

    // Change to private
    fireEvent.click(privateButton)

    expect(privateButton).toHaveAttribute('aria-pressed', 'true')
    expect(publicButton).toHaveAttribute('aria-pressed', 'false')

    // Save
    fireEvent.click(screen.getByRole('button', { name: 'actions.save' }))

    await waitFor(() =>
      expect(eventThunks.patchACLCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          calId: 'user1/cal1',
          request: ''
        })
      )
    )
  })

  it('copies CalDAV link from Access tab', async () => {
    window.DAV_BASE_URL = 'https://cal.example.org'
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
    })
    ;(fetchSecretLink as jest.Mock).mockResolvedValue({
      secretLink: 'https://example.org/secret/initial'
    })

    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    )

    // Switch to Access tab
    fireEvent.click(screen.getByRole('tab', { name: /Access/i }))

    // Expect text field with caldav link
    const input = screen.getByLabelText('calendar.caldav_access')
    expect(input).toHaveValue('https://cal.example.org/calendars/user1/cal1')

    // Click copy button (find button containing ContentCopyIcon)
    const copyIcon = screen.getAllByTestId('ContentCopyIcon')[0]
    const copyButton = copyIcon.closest('button')
    if (copyButton) {
      fireEvent.click(copyButton)
    }

    expect(navigator.clipboard.writeText as jest.Mock).toHaveBeenCalledWith(
      'https://cal.example.org/calendars/user1/cal1'
    )

    // Snackbar should appear
    await waitFor(() =>
      expect(screen.getByText('common.link_copied')).toBeInTheDocument()
    )
  })

  describe('Import flow', () => {
    const file = new File(['test'], 'events.ics', { type: 'text/calendar' })

    it("creates a new calendar and imports events when Import with 'new' target", async () => {
      jest
        .spyOn(eventThunks, 'createCalendarAsync')
        .mockImplementation(mockThunkWithUnwrap())
      jest
        .spyOn(eventThunks, 'importEventFromFile')
        .mockImplementation(mockThunkWithUnwrap())

      renderWithProviders(
        <CalendarPopover open={true} onClose={mockOnClose} />,
        {
          user: baseUser
        }
      )

      // Switch to Import tab
      fireEvent.click(screen.getByRole('tab', { name: /Import/i }))

      // Provide new calendar params
      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'Imported Calendar' }
      })
      const fileInput = screen.getByLabelText('common.select_file')
      fireEvent.change(fileInput, { target: { files: [file] } })

      // Click Import
      fireEvent.click(screen.getByRole('button', { name: 'actions.import' }))

      await waitFor(() =>
        expect(eventThunks.createCalendarAsync).toHaveBeenCalled()
      )
      await waitFor(() =>
        expect(eventThunks.importEventFromFile).toHaveBeenCalled()
      )
    })

    it('imports into an existing calendar when target is set', async () => {
      jest
        .spyOn(eventThunks, 'importEventFromFile')
        .mockImplementation(mockThunkWithUnwrap())

      const calendars = {
        'user1/cal1': existingCalendar
      }

      renderWithProviders(
        <CalendarPopover
          open={true}
          onClose={mockOnClose}
          calendar={existingCalendar}
        />,
        { user: baseUser, calendars: { list: calendars } }
      )

      fireEvent.click(screen.getByRole('tab', { name: /Import/i }))
      const fileInput = screen.getByLabelText('common.select_file')
      fireEvent.change(fileInput, { target: { files: [file] } })

      fireEvent.click(screen.getByRole('button', { name: 'actions.import' }))

      await waitFor(() =>
        expect(eventThunks.importEventFromFile).toHaveBeenCalledWith(
          expect.objectContaining({
            calLink: '/calendars/user1/cal1.json',
            file
          })
        )
      )
    })

    it('disables Import button until a file is uploaded', () => {
      renderWithProviders(
        <CalendarPopover open={true} onClose={mockOnClose} />,
        {
          user: baseUser
        }
      )

      fireEvent.click(screen.getByRole('tab', { name: /Import/i }))

      const importButton = screen.getByRole('button', {
        name: 'actions.import'
      })
      expect(importButton).toBeDisabled()
    })
  })

  describe('Import into a delegated calendar', () => {
    const delegatedCalendar = (write: boolean): Calendar => ({
      id: 'owner1/cal1',
      link: '/calendars/user1/shared1.json',
      name: 'Owner Calendar',
      owner: { firstname: 'Owner', emails: ['owner@example.com'] },
      visibility: 'public',
      delegated: true,
      access: {
        freebusy: false,
        read: true,
        write,
        'write-properties': write,
        all: false
      },
      events: {}
    })

    it('offers the Import tab on a calendar delegated with a write right', () => {
      renderWithProviders(
        <CalendarPopover
          open={true}
          onClose={mockOnClose}
          calendar={delegatedCalendar(true)}
        />,
        { user: baseUser }
      )

      expect(screen.getByRole('tab', { name: /Import/i })).toBeInTheDocument()
    })

    it('hides the Import tab on a calendar delegated read only', () => {
      renderWithProviders(
        <CalendarPopover
          open={true}
          onClose={mockOnClose}
          calendar={delegatedCalendar(false)}
        />,
        { user: baseUser }
      )

      expect(
        screen.queryByRole('tab', { name: /Import/i })
      ).not.toBeInTheDocument()
    })

    it('offers the delegated calendar as an import destination', () => {
      const calendar = delegatedCalendar(true)

      renderWithProviders(
        <CalendarPopover
          open={true}
          onClose={mockOnClose}
          calendar={calendar}
        />,
        { user: baseUser, calendars: { list: { [calendar.id]: calendar } } }
      )

      fireEvent.click(screen.getByRole('tab', { name: /Import/i }))

      expect(screen.getByText('Owner Calendar')).toBeInTheDocument()
    })

    it('imports into the calendar link the delegation exposes', async () => {
      jest
        .spyOn(eventThunks, 'importEventFromFile')
        .mockImplementation(mockThunkWithUnwrap())
      const calendar = delegatedCalendar(true)

      renderWithProviders(
        <CalendarPopover
          open={true}
          onClose={mockOnClose}
          calendar={calendar}
        />,
        { user: baseUser, calendars: { list: { [calendar.id]: calendar } } }
      )

      fireEvent.click(screen.getByRole('tab', { name: /Import/i }))
      fireEvent.change(screen.getByLabelText('common.select_file'), {
        target: { files: [new File(['test'], 'events.ics')] }
      })
      fireEvent.click(screen.getByRole('button', { name: 'actions.import' }))

      await waitFor(() =>
        expect(eventThunks.importEventFromFile).toHaveBeenCalledWith(
          expect.objectContaining({ calLink: '/calendars/user1/shared1.json' })
        )
      )
    })
  })

  it('fetches and resets the secret link', async () => {
    window.DAV_BASE_URL = 'https://cal.example.org'
    ;(fetchSecretLink as jest.Mock)
      .mockResolvedValueOnce({
        secretLink: 'https://example.org/secret/initial'
      })
      .mockResolvedValueOnce({
        secretLink: 'https://example.org/secret/new'
      })

    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { user: baseUser }
    )

    fireEvent.click(screen.getByRole('tab', { name: /Access/i }))

    await waitFor(() =>
      expect(
        screen.getByDisplayValue('https://example.org/secret/initial')
      ).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    await waitFor(() =>
      expect(
        screen.getByDisplayValue('https://example.org/secret/new')
      ).toBeInTheDocument()
    )

    expect(fetchSecretLink).toHaveBeenCalledWith(
      existingCalendar.link.replace('.json', ''),
      true
    )
  })
})

describe('CalendarPopover - public visibility of calendars administered by the user', () => {
  const mockOnClose = jest.fn()
  const user = {
    userData: { openpaasId: 'user1', email: 'user1@example.com' }
  }

  const administered = (
    owner: Calendar['owner'],
    access: 2 | 3 | 5
  ): Calendar => ({
    id: 'home1/cal1',
    link: '/calendars/user1/instance1.json',
    name: 'Administered',
    description: '',
    color: { light: '#0062FF', dark: '#FFF' },
    visibility: 'public',
    delegated: true,
    events: {},
    owner,
    invite: [
      {
        href: 'mailto:user1@example.com',
        principal: '/principals/users/user1',
        access,
        inviteStatus: 1
      }
    ]
  })

  const team = { firstname: 'Team', emails: [], teamCalendar: true }
  const resource = { firstname: 'Room', emails: [], resource: true }
  const somebody = { firstname: 'Owner', emails: ['owner@example.com'] }

  afterEach(() => jest.clearAllMocks())

  it.each([
    ['a team calendar', team],
    ['a resource', resource],
    ["somebody else's calendar", somebody]
  ])('offers the public visibility to an administrator of %s', (_, owner) => {
    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={administered(owner, 5)}
      />,
      { user }
    )

    expect(screen.getByText('calendar.newEventsVisibility')).toBeInTheDocument()
  })

  it.each([
    ['a team calendar', team, 3],
    ['a resource', resource, 3],
    ["somebody else's calendar, read only", somebody, 2],
    ["somebody else's calendar, read write", somebody, 3]
  ] as const)(
    'shows the public visibility read only to a member of %s without the administration right',
    (_, owner, access) => {
      renderWithProviders(
        <CalendarPopover
          open={true}
          onClose={mockOnClose}
          calendar={administered(owner, access)}
        />,
        { user }
      )

      expect(
        screen.getByText('calendar.newEventsVisibility')
      ).toBeInTheDocument()
      const publicButton = screen.getByRole('button', { name: /All/i })
      expect(publicButton).toHaveAttribute('aria-pressed', 'true')
      expect(publicButton).toBeDisabled()
      expect(screen.getByRole('button', { name: /You/i })).toBeDisabled()
    }
  )

  it('does not show the public visibility of a calendar that is not lent to the user', () => {
    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={{
          ...administered(somebody, 2),
          delegated: false,
          invite: []
        }}
      />,
      { user }
    )

    expect(
      screen.queryByText('calendar.newEventsVisibility')
    ).not.toBeInTheDocument()
  })

  it("saves the public visibility of a team calendar through the administrator's instance", async () => {
    jest
      .spyOn(eventThunks, 'patchCalendar')
      .mockImplementation(mockThunkWithUnwrap())
    jest
      .spyOn(eventThunks, 'patchACLCalendar')
      .mockImplementation(mockThunkWithUnwrap())

    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={administered(team, 5)}
      />,
      { user }
    )
    fireEvent.click(screen.getByRole('button', { name: /You/i }))
    fireEvent.click(screen.getByRole('button', { name: 'actions.save' }))

    await waitFor(() =>
      expect(eventThunks.patchACLCalendar).toHaveBeenCalledWith({
        calId: 'home1/cal1',
        calLink: '/calendars/user1/instance1.json',
        request: ''
      })
    )
  })
})
