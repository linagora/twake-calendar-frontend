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
