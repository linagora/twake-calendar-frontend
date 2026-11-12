import type { AuthConfig } from '@linagora/twake-oidc'
import en from '@common/locales/en.json'
import { redirectTo } from '@common/utils/navigation'
import { configureAuth, startLogin } from '@linagora/twake-oidc'
import { screen, waitFor } from '@testing-library/react'
import type { Mock } from 'vitest'

// The page as the browser loads it (apps/private/src/index.tsx): every path
// under /intents is the intents page or an error, never the calendar, and its
// sign-in is silent and comes back to /intents/callback, not to the callback
// of the calendar (which no other app may frame)
const { sdk } = vi.hoisted(() => {
  window.SSO_BASE_URL = 'https://sso.example.com'
  window.SSO_CLIENT_ID = 'calendar'
  window.SSO_SCOPE = 'openid email profile'
  window.SSO_REDIRECT_URI = 'https://calendar.example.com/callback'
  window.SSO_POST_LOGOUT_REDIRECT = 'https://calendar.example.com/'
  // In the dialog of Twake Chat
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
  return { sdk }
})

vi.mock('@linagora/twake-oidc', async () => ({
  ...(await vi.importActual('@linagora/twake-oidc')),
  configureAuth: vi.fn(),
  startLogin: vi.fn(),
  completeLogin: vi.fn()
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

// Loads the page at that address, as a new document
const boot = async (path: string): Promise<void> => {
  vi.resetModules()
  window.history.replaceState(null, '', path)
  document.body.innerHTML = '<div id="root"></div>'
  await import('@private/index')
}

// What the page hands to twake-oidc, read at each sign-in
const authConfig = (): AuthConfig => {
  const calls = (configureAuth as Mock).mock.calls as [AuthConfig][]
  expect(calls).toHaveLength(1)
  return calls[0][0]
}
const isFramed = (config: AuthConfig): boolean =>
  typeof config.framed === 'function' ? config.framed() : Boolean(config.framed)

describe('the intents page as the browser loads it', () => {
  it.each([
    '/intents/settings',
    '/intents/',
    '/intents/callback?code=c&state=s'
  ])('shows the intents page at %s, never the calendar', async path => {
    await boot(path)

    const heading = await screen.findByRole(
      'heading',
      { level: 1, name: t('intents.unavailable.title') },
      { timeout: 10000 }
    )
    expect(screen.getByRole('main')).toContainElement(heading)
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(redirectTo).not.toHaveBeenCalled()
  })

  it('signs in silently and comes back to /intents/callback', async () => {
    await boot('/intents?intent=intent-1')

    const config = authConfig()
    expect(config.redirectUri).toBe(
      'https://calendar.example.com/intents/callback'
    )
    expect(isFramed(config)).toBe(true)
    await waitFor(() => expect(startLogin).toHaveBeenCalledTimes(1))
    expect(window.location.pathname).toBe('/intents')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(redirectTo).not.toHaveBeenCalled()
  })

  // A deployment whose .env.js lacks the redirect URI, or gives a path: the
  // frame says it failed, it never stays blank
  it.each(['', '/callback'])(
    'says it failed on /intents when the redirect URI of the calendar is %j',
    async redirectUri => {
      const appRedirectUri = window.SSO_REDIRECT_URI
      window.SSO_REDIRECT_URI = redirectUri
      onTestFinished(() => {
        window.SSO_REDIRECT_URI = appRedirectUri
      })

      await boot('/intents?intent=intent-1')

      const heading = await screen.findByRole(
        'heading',
        { level: 1, name: t('intents.failed.title') },
        { timeout: 10000 }
      )
      expect(screen.getByRole('main')).toContainElement(heading)
      expect(startLogin).not.toHaveBeenCalled()
      expect(redirectTo).not.toHaveBeenCalled()
    }
  )

  it('keeps the callback of the calendar for the calendar', async () => {
    await boot('/calendar')

    const config = authConfig()
    expect(config.redirectUri).toBe('https://calendar.example.com/callback')
    expect(isFramed(config)).toBe(false)
  })
})
