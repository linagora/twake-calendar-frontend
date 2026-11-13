import type { Mock } from 'vitest'
import { store } from '@common/app/store'
import en from '@common/locales/en.json'
import { fetchCalendars } from '@common/features/Calendars/CalendarDAO'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import { setTokens, setUserData } from '@common/features/User/UserSlice'
import { redirectTo } from '@common/utils/navigation'
import { setTokenSet, startLogin } from '@linagora/twake-oidc'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// The session ends while the user saves the new event in the frame of Twake
// Chat: the calendar server answers 401. The page as the browser loads it
// (apps/private/src/index.tsx, its own configureAuth), the real ky client and
// twake-oidc: framed, twake-oidc never goes to the SSO, it calls the
// onLoginRequired of the app. On /intents, as the old embed did with its
// `login-required`, the page says the session expired and the client gets an
// error, so Chat opens Calendar in a tab instead.
const CHAT = 'https://chat.example.com'
const CALENDAR_API = 'https://calendar-api.example.com'
const USER_ID = '667037022b752d0026472254'

const { client, sdk } = vi.hoisted(() => {
  window.SSO_BASE_URL = 'https://sso.example.com'
  window.SSO_CLIENT_ID = 'calendar'
  window.SSO_SCOPE = 'openid email profile'
  window.SSO_REDIRECT_URI = 'https://calendar.example.com/callback'
  window.SSO_POST_LOGOUT_REDIRECT = 'https://calendar.example.com/'
  window.CALENDAR_BASE_URL = 'https://calendar-api.example.com'
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  // The window of Twake Chat, around the frame
  const client = { postMessage: vi.fn() }
  Object.defineProperty(window, 'parent', {
    configurable: true,
    get: () => client
  })
  // The client of the user's platform (cozy-stack)
  const sdk = {
    platformURL: 'https://alice.workplace.test',
    status: 'waiting',
    login: vi.fn(),
    logout: vi.fn(),
    fetchJSON: vi.fn(),
    onStatusChange: vi.fn(() => () => undefined)
  }
  return { client, sdk }
})

vi.mock('@linagora/twake-oidc', async () => ({
  ...(await vi.importActual('@linagora/twake-oidc')),
  startLogin: vi.fn(),
  completeLogin: vi.fn()
}))
vi.mock('@linagora/twake-sdk', async () => ({
  ...(await vi.importActual<typeof import('@linagora/twake-sdk')>(
    '@linagora/twake-sdk'
  )),
  createSdk: () => sdk
}))
// A save waits for the websocket of the calendar: here it is alive
vi.mock('@linagora/twake-websocket', async () => ({
  ...(await vi.importActual('@linagora/twake-websocket')),
  assertWebSocketAlive: vi.fn()
}))
// See sessionEndedElsewhere.test.tsx: the router of the routes of the app
vi.mock('redux-first-history/rr6', async () => ({
  HistoryRouter: (await import('react-router')).unstable_HistoryRouter
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

const t = (key: string): string => {
  const text = key
    .split('.')
    .reduce<unknown>(
      (dict, part) => (dict as Record<string, unknown> | undefined)?.[part],
      en
    )
  if (typeof text !== 'string') throw new Error(`en.json has no ${key}`)
  return text
}

type Message = { type: string }
const sent = (): [Message, string][] =>
  client.postMessage.mock.calls as [Message, string][]
const sentOfType = (kind: string): [Message, string][] =>
  sent().filter(([message]) => message.type === `intent-intent-1:${kind}`)
const answers = (): [Message, string][] =>
  sent().filter(([message]) =>
    /:(done|cancel|error|exposeFrameRemoval)$/.test(message.type)
  )

// What the calendar server got, and the session it ended: every write is
// refused with a 401
const requests: Request[] = []
const calendarServer = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const request = new Request(input, init)
  requests.push(request)
  if (request.method === 'PUT') return new Response(null, { status: 401 })
  return new Response('{}', {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
}

describe('the new event intent when the session ends while it saves', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(calendarServer))
    sdk.login.mockImplementation(async () => {
      sdk.status = 'ready'
    })
    sdk.fetchJSON.mockResolvedValue({
      data: {
        type: 'io.cozy.intents',
        id: 'intent-1',
        attributes: {
          action: 'CREATE',
          type: 'io.cozy.calendar.events',
          permissions: ['GET'],
          client: CHAT,
          frameAncestors: [CHAT]
        }
      }
    })
    ;(fetchCalendars as Mock).mockResolvedValue({
      _embedded: {
        'dav:calendar': [
          {
            _links: { self: { href: `/calendars/${USER_ID}/${USER_ID}.json` } },
            'dav:name': 'My calendar',
            color: '#FF0000'
          }
        ]
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('says the session expired, gives the client an error, and goes to no SSO', async () => {
    // Signed in at the SSO, before the page loads (the silent sign-in of
    // the frame is done)
    setTokenSet({ access_token: 'token', id_token: 'id-token-alice' })
    store.dispatch(
      setUserData({
        sub: 'test',
        email: 'test@test.com',
        openpaasId: USER_ID,
        workplaceFqdn: 'alice.workplace.test'
      } as Parameters<typeof setUserData>[0])
    )
    store.dispatch(
      setTokens({ access_token: 'token', id_token: 'id-token-alice' })
    )
    await act(async () => {
      await store.dispatch(getCalendarsList())
    })
    document.body.innerHTML = '<div id="root"></div>'
    await import('@private/index')

    // Chat answers the `ready` of the page with the members of the room
    await waitFor(() => expect(sentOfType('ready')).toHaveLength(1), {
      timeout: 10000
    })
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { attendees: ['bob@example.com'] },
          origin: CHAT,
          source: client as unknown as Window
        })
      )
    })
    const user = userEvent.setup()
    await user.type(
      await screen.findByRole(
        'textbox',
        { name: /title/i },
        { timeout: 10000 }
      ),
      'Weekly sync'
    )
    await user.click(screen.getByRole('button', { name: t('actions.save') }))

    // The save reached the calendar server with the session, which refused it
    await waitFor(() =>
      expect(requests.filter(r => r.method === 'PUT')).toHaveLength(1)
    )
    const [save] = requests.filter(r => r.method === 'PUT')
    expect(new URL(save.url).origin).toBe(CALENDAR_API)
    expect(save.headers.get('Authorization')).toBe('Bearer token')

    const heading = await screen.findByRole(
      'heading',
      { level: 1, name: t('intents.sessionExpired.title') },
      { timeout: 10000 }
    )
    expect(screen.getByRole('main')).toContainElement(heading)
    expect(
      screen.queryByRole('textbox', { name: /title/i })
    ).not.toBeInTheDocument()
    await waitFor(() => expect(sentOfType('error')).toHaveLength(1))
    expect(answers()).toEqual(sentOfType('error'))
    for (const [message, target] of sent()) {
      expect(message.type).toMatch(/^intent-intent-1:/)
      expect(target).toBe(CHAT)
    }
    // The frame stays where it is: no SSO, no calendar
    expect(startLogin).not.toHaveBeenCalled()
    expect(redirectTo).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/intents')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })
})
