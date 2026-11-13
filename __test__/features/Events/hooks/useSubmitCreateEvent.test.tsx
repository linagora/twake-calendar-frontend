import { putEvent } from '@common/features/Events/EventDao'
import EventPopover from '@common/features/Events/EventModal'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../utils/Renderwithproviders'

vi.mock('@common/utils/apiUtils')
vi.mock('@common/features/Events/EventDao', async () => ({
  ...(await vi.importActual('@common/features/Events/EventDao')),
  putEvent: vi.fn()
}))

// The calendars of the user failed to load: the application still opens,
// with no calendar to save an event into
const withoutCalendars = {
  user: {
    userData: {
      sub: 'test',
      email: 'test@test.com',
      openpaasId: '667037022b752d0026472254'
    },
    tokens: { access_token: 'token' },
    organiserData: new userOrganiser({
      cn: 'test',
      cal_address: 'test@test.com'
    })
  },
  calendars: { pending: false, list: {} }
}

describe('saving a new event without any calendar', () => {
  it('sends nothing, raises no error and keeps the form open with what the user typed', async () => {
    // An error left unhandled is a crash, reported as such
    const crashes: unknown[] = []
    const onCrash = (reason: unknown): void => {
      crashes.push(reason)
    }
    process.on('unhandledRejection', onCrash)
    onTestFinished(() => {
      process.off('unhandledRejection', onCrash)
    })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <EventPopover
        open
        onClose={onClose}
        selectedRange={null}
        setSelectedRange={vi.fn()}
        calendarRef={{ current: null }}
      />,
      withoutCalendars
    )

    const title = screen.getByRole('textbox', { name: /title/i })
    await user.type(title, 'Weekly sync')
    await user.click(screen.getByRole('button', { name: 'actions.save' }))

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(crashes).toEqual([])
    expect(putEvent).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue(
      'Weekly sync'
    )
  })
})

const USER_ID = '667037022b752d0026472254'
const withMyCalendar = {
  ...withoutCalendars,
  calendars: {
    pending: false,
    list: {
      [`${USER_ID}/${USER_ID}`]: {
        id: `${USER_ID}/${USER_ID}`,
        name: 'My calendar',
        color: { light: '#FF0000', dark: '#000' },
        owner: { emails: ['test@test.com'] },
        events: {}
      }
    }
  }
}

describe('a saved event whose follow-up fails', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('still counts as saved: no failed draft kept, the form not reopened as failed', async () => {
    vi.mocked(putEvent).mockResolvedValue(new Response(null, { status: 201 }))
    // The calendar reopens the create form when a save fails
    const reopened = vi.fn()
    window.addEventListener('eventModalError', reopened)
    onTestFinished(() => {
      window.removeEventListener('eventModalError', reopened)
    })
    // What runs once the server has the event breaks (the frame that asked
    // for it is gone, say)
    const onCreated = vi.fn(() => {
      throw new Error('The page that asked for the event is gone')
    })
    const user = userEvent.setup()
    renderWithProviders(
      <EventPopover
        open
        onClose={vi.fn()}
        onCreated={onCreated}
        selectedRange={null}
        setSelectedRange={vi.fn()}
        calendarRef={{ current: null }}
      />,
      withMyCalendar
    )

    await user.type(
      screen.getByRole('textbox', { name: /title/i }),
      'Weekly sync'
    )
    await user.click(screen.getByRole('button', { name: 'actions.save' }))

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalled())
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(putEvent).toHaveBeenCalledTimes(1)
    // The draft a failed save keeps for the next form
    expect(sessionStorage.getItem('eventFormTempData_create')).toBeNull()
    expect(reopened).not.toHaveBeenCalled()
  })
})
