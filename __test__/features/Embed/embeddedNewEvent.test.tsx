import type { Mock } from 'vitest'
import { setupStore } from '@common/app/store'
import en from '@common/locales/en.json'
import { putEvent } from '@common/features/Events/EventDao'
import { userOrganiser } from '@common/features/User/userDataTypes'
import type { CalendarEvent } from '@common/types/EventsTypes'
import App from '@private/App'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
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
vi.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: vi.fn(() => ({ isTooSmall: false, isTablet: false }))
}))

const USER_ID = '667037022b752d0026472254'

// The route renders the whole application, in English: what the user reads
const t = (key: string): string =>
  key
    .split('.')
    .reduce<unknown>(
      (dict, part) => (dict as Record<string, unknown>)[part],
      en
    ) as string

const renderRoute = (search = SEARCH): ReturnType<typeof setupStore> => {
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
    calendars: {
      ...initial.calendars,
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

  it('tells Twake Chat about the event it saved', async () => {
    const user = userEvent.setup()
    renderRoute()
    greet()

    await user.type(await findForm(), 'Weekly sync')
    await user.click(screen.getByRole('button', { name: t('actions.save') }))

    await waitFor(() =>
      expect(sentOfType('twake-calendar:event-created')).toHaveLength(1)
    )
    const saved = (putEvent as Mock).mock.calls[0][0] as CalendarEvent
    expect(sentOfType('twake-calendar:event-created')).toEqual([
      [
        {
          type: 'twake-calendar:event-created',
          event: {
            uid: saved.uid,
            title: 'Weekly sync',
            start: saved.start,
            end: saved.end,
            allDay: false,
            timeZone: saved.timezone,
            videoConferenceUrl: saved.x_openpass_videoconference ?? null,
            url: `${window.location.origin}/events/${saved.uid}`
          }
        },
        CHAT
      ]
    ])
    expect(Date.parse(saved.start)).not.toBeNaN()
    expect(Date.parse(saved.end)).not.toBeNaN()
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

    await waitFor(() => expect(putEvent).toHaveBeenCalled())
    expect(await findForm()).toHaveValue('Weekly sync')
    expect(sentOfType('twake-calendar:event-created')).toEqual([])
    expect(sentOfType('twake-calendar:closed')).toEqual([])
  })

  it('opens a new event for the room of each frame, never the draft of a failed save in another one', async () => {
    // A save fails in the frame of one room, which the user then leaves
    ;(putEvent as Mock).mockRejectedValue(new Error('Server down'))
    const user = userEvent.setup()
    renderRoute()
    await user.type(await findForm(), 'Draft of another room')
    await user.click(screen.getByRole('button', { name: t('actions.save') }))
    await waitFor(() => expect(putEvent).toHaveBeenCalled())
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
