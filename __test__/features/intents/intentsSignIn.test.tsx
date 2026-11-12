import type { Mock } from 'vitest'
import { setupStore } from '@common/app/store'
import en from '@common/locales/en.json'
import fr from '@common/locales/fr.json'
import { fetchCalendars } from '@common/features/Calendars/CalendarDAO'
import { fetchCurrentUser } from '@common/features/User/UserDao'
import { redirectTo } from '@common/utils/navigation'
import {
  completeLogin,
  LoginRequiredError,
  startLogin
} from '@linagora/twake-oidc'
import { IntentsApp } from '@private/IntentsApp'
import { act, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'

// The frame of the intent signs in silently (prompt=none: a frame never shows
// the login form of the SSO); the SSO comes back to /intents/callback, the
// redirect URI of the intents page, which goes back to /intents?intent=<id>.
const CHAT = 'https://chat.example.com'
const INTENT_PATH = '/intents?intent=intent-1'

const { client, sdk } = vi.hoisted(() => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  const client = { postMessage: vi.fn() }
  Object.defineProperty(window, 'parent', {
    configurable: true,
    get: () => client
  })
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
  completeLogin: vi.fn(),
  startLogin: vi.fn(),
  LoginRequiredError: class extends Error {
    constructor(readonly returnTo: string) {
      super('The SSO needs the user to sign in')
    }
  }
}))
vi.mock('@linagora/twake-sdk', async () => ({
  ...(await vi.importActual<typeof import('@linagora/twake-sdk')>(
    '@linagora/twake-sdk'
  )),
  createSdk: () => sdk
}))
// See sessionEndedElsewhere.test.tsx: the router of the routes of the app
vi.mock('redux-first-history/rr6', async () => ({
  HistoryRouter: (await import('react-router')).unstable_HistoryRouter
}))
vi.mock('@common/utils/apiUtils')
vi.mock('@common/features/User/UserDao', async () => ({
  ...(await vi.importActual('@common/features/User/UserDao')),
  fetchCurrentUser: vi.fn()
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

const findMessage = async (kind: string): Promise<void> => {
  const heading = await screen.findByRole(
    'heading',
    { level: 1, name: t(`intents.${kind}.title`) },
    { timeout: 10000 }
  )
  expect(screen.getByRole('main')).toContainElement(heading)
}

// The sign-in twake-oidc keeps while the SSO answers
const pendingSignIn = (returnTo: string): void => {
  sessionStorage.setItem(
    'redirectState',
    JSON.stringify({ code_verifier: 'v', state: 's', returnTo, silent: true })
  )
}

const openAt = (path: string): void => {
  window.history.replaceState(null, '', path)
  render(
    <Provider store={setupStore()}>
      <IntentsApp />
    </Provider>
  )
}

const here = (): string => window.location.pathname + window.location.search

type Message = { type: string }
const sent = (): Message[] =>
  (client.postMessage.mock.calls as [Message, string][]).map(([m]) => m)
// How the intent ends for the client: the event, null, or an error
const answers = (): Message[] =>
  sent().filter(m => /:(done|cancel|error|exposeFrameRemoval)$/.test(m.type))
const errorsSent = (): Message[] =>
  sent().filter(m => m.type === 'intent-intent-1:error')

// The SSO comes back with the user signed in, for the intent
const signedInAtCallback = (): void => {
  pendingSignIn(INTENT_PATH)
  ;(completeLogin as Mock).mockResolvedValue({
    tokenSet: { access_token: 'token', id_token: 'id-token-alice' },
    userinfo: {
      sub: 'test',
      email: 'test@test.com',
      workplaceFqdn: 'alice.workplace.test'
    },
    returnTo: INTENT_PATH
  })
}

describe('the sign-in of the intents page', () => {
  beforeEach(() => {
    sdk.status = 'waiting'
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
          client: CHAT,
          frameAncestors: [CHAT]
        }
      }
    })
    ;(fetchCurrentUser as Mock).mockResolvedValue({
      id: USER_ID,
      firstname: 'Test',
      lastname: 'User',
      preferredEmail: 'test@test.com',
      emails: ['test@test.com']
    })
    ;(fetchCalendars as Mock).mockResolvedValue({
      _embedded: { 'dav:calendar': [] }
    })
  })

  afterEach(() => {
    sessionStorage.removeItem('redirectState')
  })

  it('signs in on a fresh load of the intent, and shows no calendar meanwhile', async () => {
    openAt(INTENT_PATH)

    await waitFor(() => expect(startLogin).toHaveBeenCalledTimes(1))
    expect(here()).toBe(INTENT_PATH)
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: /title/i })
    ).not.toBeInTheDocument()
    expect(redirectTo).not.toHaveBeenCalled()
  })

  it('completes a login started by the intents page, then serves the intent', async () => {
    pendingSignIn(INTENT_PATH)
    ;(completeLogin as Mock).mockResolvedValue({
      tokenSet: { access_token: 'token', id_token: 'id-token-alice' },
      userinfo: {
        sub: 'test',
        email: 'test@test.com',
        workplaceFqdn: 'alice.workplace.test'
      },
      returnTo: INTENT_PATH
    })

    openAt('/intents/callback?code=c&state=s')

    await waitFor(() => expect(here()).toBe(INTENT_PATH), { timeout: 10000 })
    // The page goes on with the intent: it says `ready` to the client
    await waitFor(
      () =>
        expect(client.postMessage).toHaveBeenCalledWith(
          { type: 'intent-intent-1:ready' },
          CHAT
        ),
      { timeout: 10000 }
    )
    expect(sdk.login).toHaveBeenCalledWith('id-token-alice')
    expect(startLogin).not.toHaveBeenCalled()
    expect(redirectTo).not.toHaveBeenCalled()
  })

  // The callback loads the user and their calendars, as the one of the
  // calendar does (CallbackResume): a load that fails is a failure of the
  // page, which the client is told, never a list without a calendar
  it.each([
    [
      'the user',
      (): void => {
        ;(fetchCurrentUser as Mock).mockRejectedValue(new Error('Server down'))
      }
    ],
    [
      'the calendars',
      (): void => {
        ;(fetchCalendars as Mock).mockRejectedValue(new Error('Server down'))
      }
    ]
  ])(
    'says it failed and gives the client an error when %s cannot be loaded after the sign-in',
    async (_, failTheLoad) => {
      failTheLoad()
      signedInAtCallback()

      openAt('/intents/callback?code=c&state=s')

      // Chat answers the `ready` of the page with the members of the room
      await waitFor(
        () =>
          expect(client.postMessage).toHaveBeenCalledWith(
            { type: 'intent-intent-1:ready' },
            CHAT
          ),
        { timeout: 10000 }
      )
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { attendees: ['bob@example.com'] },
            origin: CHAT,
            source: client as unknown as Window
          })
        )
      })
      await findMessage('failed')
      await waitFor(() => expect(errorsSent()).toHaveLength(1))
      expect(answers()).toEqual(errorsSent())
      expect(
        screen.queryByText(t('error.calendarsNotFound'))
      ).not.toBeInTheDocument()
      expect(redirectTo).not.toHaveBeenCalled()
    }
  )

  it('says the session expired when the SSO refuses the silent sign-in, without a login form', async () => {
    pendingSignIn(INTENT_PATH)
    ;(completeLogin as Mock).mockRejectedValue(
      new LoginRequiredError(INTENT_PATH)
    )

    openAt('/intents/callback?error=login_required&state=s')

    await findMessage('sessionExpired')
    expect(here()).toBe(INTENT_PATH)
    expect(startLogin).not.toHaveBeenCalled()
    expect(redirectTo).not.toHaveBeenCalled()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('serves no intent on a path under /intents without one, and never the calendar', async () => {
    openAt('/intents/settings')

    await findMessage('unavailable')
    expect(window.location.pathname).toBe('/intents/settings')
    expect(redirectTo).not.toHaveBeenCalled()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('says the SSO failed when the callback fails for another reason, without a login form', async () => {
    pendingSignIn(INTENT_PATH)
    ;(completeLogin as Mock).mockRejectedValue(new Error('SSO down'))

    openAt('/intents/callback?code=c&state=s')

    await findMessage('failed')
    expect(here()).toBe(INTENT_PATH)
    expect(startLogin).not.toHaveBeenCalled()
    expect(redirectTo).not.toHaveBeenCalled()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('speaks the language of the account of the user', async () => {
    window.history.replaceState(null, '', '/intents/settings')
    const initial = setupStore().getState()
    render(
      <Provider
        store={setupStore({
          ...initial,
          user: {
            ...initial.user,
            coreConfig: { ...initial.user.coreConfig, language: 'fr' }
          }
        })}
      >
        <IntentsApp />
      </Provider>
    )

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: fr.intents.unavailable.title
      })
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('fr')
  })

  it('exchanges no code when the login it comes back from is not for an intent', async () => {
    openAt('/intents/callback?code=c&state=s')

    await findMessage('unavailable')
    expect(completeLogin).not.toHaveBeenCalled()
    expect(redirectTo).not.toHaveBeenCalled()
  })
})
