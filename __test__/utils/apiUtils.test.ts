jest.mock(
  '@common/websocket/connection/lifecycle/assertWebSocketAlive',
  () => ({ assertWebSocketAlive: jest.fn() })
)

describe('api client authorization', () => {
  const sent: Request[] = []

  beforeAll(() => {
    Object.assign(global, {
      window: {
        CALENDAR_BASE_URL: 'https://calendar.example.com',
        location: { href: 'https://calendar-app.example.com/calendar' }
      }
    })
  })

  beforeEach(() => {
    sent.length = 0
    global.fetch = jest.fn(async (request: Request) => {
      sent.push(request)
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
  })

  type Loaded = typeof import('@common/utils/apiUtils') &
    typeof import('@linagora/twake-oidc')

  async function load(): Promise<Loaded> {
    let module: Loaded | undefined
    await jest.isolateModulesAsync(async () => {
      const auth = await import('@linagora/twake-oidc')
      auth.configureAuth({
        ssoUrl: 'https://sso.example.com',
        clientId: 'calendar',
        scope: 'openid',
        redirectUri: 'https://calendar-app.example.com/callback',
        postLogoutRedirectUri: 'https://calendar-app.example.com',
        apiUrl: window.CALENDAR_BASE_URL
      })
      module = { ...auth, ...(await import('@common/utils/apiUtils')) }
    })
    return module!
  }

  it('sends the access token to the Calendar backend', async () => {
    const { api, setTokenSet } = await load()
    setTokenSet({ access_token: 'calendar-token' })

    await api.get('api/something')

    expect(sent[0].headers.get('Authorization')).toBe('Bearer calendar-token')
  })

  it('does not send the access token to another origin', async () => {
    const { api, setTokenSet } = await load()
    setTokenSet({ access_token: 'calendar-token' })

    await api.get('auth/token_exchange', {
      prefixUrl: 'https://drive.example.com'
    })

    expect(sent[0].url).toBe('https://drive.example.com/auth/token_exchange')
    expect(sent[0].headers.get('Authorization')).toBeNull()
  })

  it('never sends the access token through the external client', async () => {
    const { externalApi, setTokenSet } = await load()
    setTokenSet({ access_token: 'calendar-token' })

    await externalApi.post('auth/token_exchange', {
      prefixUrl: 'https://calendar.example.com',
      json: {}
    })

    expect(sent[0].headers.get('Authorization')).toBeNull()
  })
})
