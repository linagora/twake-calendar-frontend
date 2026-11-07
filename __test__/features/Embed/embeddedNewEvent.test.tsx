import type { Mock } from 'vitest'
import { setupStore } from '@common/app/store'
import en from '@common/locales/en.json'
import { putEvent } from '@common/features/Events/EventDao'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import { fetchCalendars } from '@common/features/Calendars/CalendarDAO'
import type { CalendarEvent } from '@common/types/EventsTypes'
import { redirectTo } from '@common/utils/navigation'
import App from '@private/App'
import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'

// Twake Chat frames the route in a dialog of a room, with the members of the
// room as attendees. The page is loaded there, before anything is imported.
const CHAT = 'https://chat.test'
const { postMessage, SEARCH } = vi.hoisted(() => {
  const SEARCH =
    '?attendee=alice%40example.com&attendee=bob%40example.com&attendee=not-an-email'
  window.history.replaceState(null, '', `/embed/newEvent${SEARCH}`)
  const postMessage = vi.fn()
  const chat = { postMessage }
  Object.defineProperty(window, 'parent', {
    configurable: true,
    get: () => chat
  })
  return { postMessage, SEARCH }
})

// The CommonJS build of redux-first-history/rr6 loads another copy of
// react-router than the routes of the app under Vite: the same router, taken
// from the copy the routes use
vi.mock('redux-first-history/rr6', async () => ({
  HistoryRouter: (await import('react-router')).unstable_HistoryRouter
}))
vi.mock('@common/utils/apiUtils')
vi.mock('@common/features/Events/EventDao', async () => ({
  ...(await vi.importActual('@common/features/Events/EventDao')),
  putEvent: vi.fn()
}))
vi.mock('@common/features/Calendars/CalendarDAO', async () => ({
  ...(await vi.importActual('@common/features/Calendars/CalendarDAO')),
  fetchCalendars: vi.fn()
}))
vi.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: vi.fn(() => ({ isTooSmall: false, isTablet: false }))
}))
// jsdom cannot leave the page: where the app would go instead
vi.mock('@common/utils/navigation', () => ({ redirectTo: vi.fn() }))

const USER_ID = '667037022b752d0026472254'

// The route renders the whole application, in English: what the user reads
const t = (key: string): string =>
  key
    .split('.')
    .reduce<unknown>(
      (dict, part) => (dict as Record<string, unknown>)[part],
      en
    ) as string

const MY_CALENDARS = {
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

const renderRoute = (
  search = SEARCH,
  calendars: { pending: boolean; list: object } = MY_CALENDARS
): ReturnType<typeof setupStore> => {
  window.history.replaceState(null, '', `/embed/newEvent${search}`)
  const initial = setupStore().getState()
  const store = setupStore({
    ...initial,
    router: {
      location: {
        pathname: '/embed/newEvent',
        search,
        hash: '',
        state: null,
        key: 'k'
      },
      action: 'POP'
    },
    user: {
      ...initial.user,
      userData: {
        sub: 'test',
        email: 'test@test.com',
        openpaasId: USER_ID
      },
      tokens: { access_token: 'token' },
      organiserData: new userOrganiser({
        cn: 'test',
        cal_address: 'test@test.com'
      })
    },
    calendars: { ...initial.calendars, ...calendars }
  } as Parameters<typeof setupStore>[0])
  render(
    <Provider store={store}>
      <App />
    </Provider>
  )
  return store
}

const greet = (): void => {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'twake-calendar:hello' },
        origin: CHAT,
        source: window.parent
      })
    )
  })
}

const sent = (): { type: string }[] =>
  (postMessage.mock.calls as [{ type: string }, string][]).map(([data]) => data)
const sentOfType = (type: string): unknown[][] =>
  (postMessage.mock.calls as [{ type: string }, string][]).filter(
    ([data]) => data.type === type
  )

const findForm = async (): Promise<HTMLElement> =>
  screen.findByRole('textbox', { name: /title/i }, { timeout: 10000 })

// A failed save keeps what the user typed for the next form: once it is
// kept, the app has handled the failure
const failureHandled = async (): Promise<void> =>
  waitFor(() =>
    expect(
      JSON.parse(sessionStorage.getItem('eventFormTempData_create') ?? '{}')
        .fromError
    ).toBe(true)
  )

// Lets every pending promise and the renders they cause run
const settle = async (): Promise<void> =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  })

describe('the new event form framed by Twake Chat', () => {
  let entries: number

  beforeEach(() => {
    entries = window.history.length
    ;(putEvent as Mock).mockResolvedValue(new Response(null, { status: 201 }))
  })

  it('shows the create form with the attendees of the link', async () => {
    renderRoute()

    await findForm()
    expect(screen.getByText(t('event.createEvent'))).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    expect(screen.queryByText('not-an-email')).not.toBeInTheDocument()
  })

  it('shows the create form without attendees when the link names none', async () => {
    renderRoute('')

    await findForm()
    expect(screen.getByText(t('event.createEvent'))).toBeInTheDocument()
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
  })

  it('shows the form alone: no expand arrow, no backdrop, no Twake bar', async () => {
    renderRoute()

    await findForm()
    expect(
      screen.queryByRole('button', { name: t('tooltip.expand') })
    ).not.toBeInTheDocument()
    expect(document.querySelector('.MuiBackdrop-root')).toBeNull()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('tells Twake Chat about the event it saved, on the day the user picked', async () => {
    // Today is 9 November 2026: the form opens on that day
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-09T10:12:00Z'))
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const user = userEvent.setup()
    renderRoute()
    greet()

    await user.type(await findForm(), 'Weekly sync')
    await user.click(
      screen.getByRole('button', { name: t('common.moreOptions') })
    )
    await user.click(
      screen.getByRole('checkbox', { name: t('event.form.allDay') })
    )
    await user.click(screen.getByRole('button', { name: t('actions.save') }))

    await waitFor(() =>
      expect(sentOfType('twake-calendar:event-created')).toHaveLength(1)
    )
    const [[message, target]] = sentOfType('twake-calendar:event-created') as [
      { event: Record<string, unknown> },
      string
    ][]
    expect(target).toBe(CHAT)
    // An all day event: from midnight UTC of its day to midnight of the next
    expect(message.event).toMatchObject({
      title: 'Weekly sync',
      start: '2026-11-09T00:00:00.000Z',
      end: '2026-11-10T00:00:00.000Z',
      allDay: true,
      videoConferenceUrl: null
    })
    const uid = message.event.uid as string
    expect(uid).toMatch(/\S/)
    expect(message.event.url).toBe(`${window.location.origin}/events/${uid}`)
    expect(typeof message.event.timeZone).toBe('string')
    expect(sentOfType('twake-calendar:closed')).toEqual([])
    expect(window.history.length).toBe(entries)
  })

  it('tells nothing when the save fails, and keeps the form for another try', async () => {
    ;(putEvent as Mock).mockRejectedValue(new Error('Server down'))
    const user = userEvent.setup()
    renderRoute()
    greet()

    await user.type(await findForm(), 'Weekly sync')
    await user.click(screen.getByRole('button', { name: t('actions.save') }))

    await failureHandled()
    await settle()
    expect(await findForm()).toHaveValue('Weekly sync')
    expect(sentOfType('twake-calendar:event-created')).toEqual([])
    expect(sentOfType('twake-calendar:closed')).toEqual([])
  })

  it('says the save failed, with a way to dismiss it, and keeps what the user typed', async () => {
    ;(putEvent as Mock).mockRejectedValue(new Error('Server down'))
    const user = userEvent.setup()
    renderRoute()
    greet()

    await user.type(await findForm(), 'Weekly sync')
    await user.click(screen.getByRole('button', { name: t('actions.save') }))

    // The message the calendar shows for a failed save (error.saveEventFailed)
    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    expect(alert).toHaveTextContent(t('error.saveEventFailed'))
    expect(
      within(alert).getByRole('button', { name: t('common.ok') })
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue(
      'Weekly sync'
    )
    expect(sentOfType('twake-calendar:event-created')).toEqual([])
  })

  it('saves the event once when the user submits again while it is saving', async () => {
    let answer: (response: Response) => void = () => {}
    ;(putEvent as Mock).mockReturnValueOnce(
      new Promise<Response>(resolve => {
        answer = resolve
      })
    )
    const user = userEvent.setup()
    renderRoute()
    greet()

    await user.type(await findForm(), 'Weekly sync')
    const save = screen.getByRole('button', { name: t('actions.save') })
    await user.click(save)
    await waitFor(() => expect(putEvent).toHaveBeenCalledTimes(1))
    // The server has not answered yet: an impatient second try, with Enter in
    // the title (Save may well be disabled by then)
    await user.click(screen.getByRole('textbox', { name: /title/i }))
    await user.keyboard('{Enter}')
    await settle()
    expect(putEvent).toHaveBeenCalledTimes(1)

    answer(new Response(null, { status: 201 }))
    await settle()
    expect(putEvent).toHaveBeenCalledTimes(1)
    expect(sentOfType('twake-calendar:event-created')).toHaveLength(1)
  })

  it('tells Twake Chat the user must sign in when the session ends in another tab, and stays in the frame', async () => {
    renderRoute()
    greet()
    await findForm()

    // Another tab of the calendar signs out
    const otherTab = new BroadcastChannel('twake-oidc-session')
    otherTab.postMessage({ type: 'session-ended', senderId: 'another-tab' })
    otherTab.close()

    await waitFor(() =>
      expect(sentOfType('twake-calendar:login-required')).toEqual([
        [{ type: 'twake-calendar:login-required' }, CHAT]
      ])
    )
    expect(redirectTo).not.toHaveBeenCalled()
  })

  it('tells Twake Chat the form is closed when the user has no calendar to save into', async () => {
    renderRoute(SEARCH, { pending: false, list: {} })
    greet()

    await waitFor(() =>
      expect(sentOfType('twake-calendar:closed')).toEqual([
        [{ type: 'twake-calendar:closed' }, CHAT]
      ])
    )
  })

  it('tells Twake Chat the form is closed when the calendars fail to load, not before', async () => {
    ;(fetchCalendars as Mock).mockRejectedValue(new Error('Server down'))
    const store = renderRoute(SEARCH, { pending: true, list: {} })
    greet()

    // Still loading: nothing to tell yet
    await settle()
    expect(sentOfType('twake-calendar:closed')).toEqual([])

    await act(async () => {
      await store.dispatch(getCalendarsList())
    })

    await waitFor(() =>
      expect(sentOfType('twake-calendar:closed')).toEqual([
        [{ type: 'twake-calendar:closed' }, CHAT]
      ])
    )
  })

  it('opens a new event for the room of each frame, never the draft of a failed save in another one', async () => {
    // A save fails in the frame of one room, which the user then leaves
    ;(putEvent as Mock).mockRejectedValue(new Error('Server down'))
    const user = userEvent.setup()
    renderRoute()
    await user.type(await findForm(), 'Draft of another room')
    await user.click(screen.getByRole('button', { name: t('actions.save') }))
    // The failure is handled: its draft is kept for the next form
    await failureHandled()
    cleanup()

    // Chat frames the form again, for another room
    renderRoute('?attendee=carol%40example.com')

    expect(await findForm()).toHaveValue('')
    expect(screen.getByText('carol@example.com')).toBeInTheDocument()
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
    expect(screen.queryByText('bob@example.com')).not.toBeInTheDocument()
  })

  it('tells Twake Chat when the user closes the form with ✕', async () => {
    const user = userEvent.setup()
    renderRoute()
    greet()

    await findForm()
    await user.click(screen.getByRole('button', { name: t('actions.close') }))

    await waitFor(() =>
      expect(sentOfType('twake-calendar:closed')).toEqual([
        [{ type: 'twake-calendar:closed' }, CHAT]
      ])
    )
    expect(putEvent).not.toHaveBeenCalled()
    expect(window.history.length).toBe(entries)
  })

  it('tells Twake Chat when the user cancels the full form', async () => {
    const user = userEvent.setup()
    renderRoute()
    greet()

    await findForm()
    await user.click(
      screen.getByRole('button', { name: t('common.moreOptions') })
    )
    await user.click(screen.getByRole('button', { name: t('common.cancel') }))

    await waitFor(() =>
      expect(sentOfType('twake-calendar:closed')).toEqual([
        [{ type: 'twake-calendar:closed' }, CHAT]
      ])
    )
  })

  it('asks before dropping a typed event, and tells nothing while the user keeps it', async () => {
    const user = userEvent.setup()
    renderRoute()
    greet()

    await user.type(await findForm(), 'Weekly sync')
    await user.click(screen.getByRole('button', { name: t('actions.close') }))

    await screen.findByRole('dialog', {
      name: t('editModeDialog.discardChanges.title')
    })
    expect(sentOfType('twake-calendar:closed')).toEqual([])
  })

  it('speaks only the protocol of Twake Chat, and only to the origin that greeted it', async () => {
    const user = userEvent.setup()
    renderRoute()

    await findForm()
    // Nothing but the request for a greeting before it
    expect(
      sent().filter(({ type }) => type !== 'twake-calendar:ready')
    ).toEqual([])

    greet()
    await user.click(screen.getByRole('button', { name: t('actions.close') }))
    await waitFor(() =>
      expect(sentOfType('twake-calendar:closed')).toHaveLength(1)
    )

    const calls = postMessage.mock.calls as [{ type: string }, string][]
    expect(
      calls.every(([data]) => data.type.startsWith('twake-calendar:'))
    ).toBe(true)
    expect(
      calls
        .filter(([data]) => data.type !== 'twake-calendar:ready')
        .every(([, target]) => target === CHAT)
    ).toBe(true)
  })
})
