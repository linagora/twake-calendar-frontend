import { screen } from '@testing-library/react'

// The intents page no longer loads the calendar (The Manh Le, Quentin,
// 2026-11-26): it is its own entry of the bundler. Each app is replaced by a
// stand-in whose module records that it was evaluated: an entry that imports
// the other app, even without rendering it, evaluates it.
// The reverse is calendarEntry.test.tsx.
const { evaluated } = vi.hoisted(() => {
  window.SSO_BASE_URL = 'https://sso.example.com'
  window.SSO_CLIENT_ID = 'calendar'
  window.SSO_SCOPE = 'openid email profile'
  window.SSO_REDIRECT_URI = 'https://calendar.example.com/callback'
  window.SSO_POST_LOGOUT_REDIRECT = 'https://calendar.example.com/'
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  return { evaluated: [] as string[] }
})

vi.mock('@private/App', () => {
  evaluated.push('calendar')
  return { default: () => <main aria-label="calendar" /> }
})
vi.mock('@private/IntentsApp', () => {
  evaluated.push('intents')
  return { IntentsApp: () => <main aria-label="intents" /> }
})
vi.mock('@linagora/twake-oidc', async () => ({
  ...(await vi.importActual('@linagora/twake-oidc')),
  configureAuth: vi.fn()
}))

describe('the intents entry', () => {
  it('shows the intents page and never loads the calendar app', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    await import('@private/intents/index')

    expect(
      await screen.findByRole('main', { name: 'intents' })
    ).toBeInTheDocument()
    expect(evaluated).toEqual(['intents'])
  })
})
