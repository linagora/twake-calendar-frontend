import { screen } from '@testing-library/react'

// Opening the calendar no longer loads the intents app (The Manh Le, Quentin,
// 2026-11-26): the intents page is its own entry of the bundler. Each app is
// replaced by a stand-in whose module records that it was evaluated: an entry
// that imports the other app, even without rendering it, evaluates it.
// The reverse is intentsEntry.test.tsx.
const { evaluated } = vi.hoisted(() => {
  window.SSO_BASE_URL = 'https://sso.example.com'
  window.SSO_CLIENT_ID = 'calendar'
  window.SSO_SCOPE = 'openid email profile'
  window.SSO_REDIRECT_URI = 'https://calendar.example.com/callback'
  window.SSO_POST_LOGOUT_REDIRECT = 'https://calendar.example.com/'
  window.history.replaceState(null, '', '/')
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

describe('the calendar entry', () => {
  it('shows the calendar and never loads the intents app', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    await import('@private/index')

    expect(
      await screen.findByRole('main', { name: 'calendar' })
    ).toBeInTheDocument()
    expect(evaluated).toEqual(['calendar'])
  })
})
