jest.mock('@common/features/User/oidcAuth', () => ({ Auth: jest.fn() }))
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

  async function load(): Promise<typeof import('@common/utils/apiUtils')> {
    let module: typeof import('@common/utils/apiUtils') | undefined
    await jest.isolateModulesAsync(async () => {
      module = await import('@common/utils/apiUtils')
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

describe('signing in again after the backend rejects the token', () => {
  const stored = new Map<string, string>()
  const assign = jest.fn()
  const loginUrl = {
    code_verifier: 'verifier123',
    state: 'state123',
    redirectTo: new URL('https://sso.example.com/authorize')
  }

  beforeEach(() => {
    stored.clear()
    Object.assign(global, {
      sessionStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
        removeItem: (key: string) => stored.delete(key)
      },
      fetch: jest.fn(() => Promise.resolve(new Response('{}', { status: 401 })))
    })
  })

  /** Answers a request from `path` with a 401, and returns the `Auth` calls. */
  async function signInAgainFrom(path: string): Promise<unknown[][]> {
    const url = new URL(path, 'https://calendar-app.example.com')
    Object.assign(global, {
      window: {
        CALENDAR_BASE_URL: 'https://calendar.example.com',
        location: {
          href: url.href,
          pathname: url.pathname,
          search: url.search,
          assign
        }
      }
    })

    let authCalls: unknown[][] = []
    await jest.isolateModulesAsync(async () => {
      const { api, setTokenSet } = await import('@common/utils/apiUtils')
      const { Auth } = await import('@common/features/User/oidcAuth')
      const authMock = Auth as jest.MockedFunction<typeof Auth>
      authMock.mockResolvedValue(loginUrl)
      setTokenSet({ access_token: 'rejected-token' })

      await expect(api.get('api/something')).rejects.toThrow()
      authCalls = authMock.mock.calls
    })
    return authCalls
  }

  it('signs in without any SSO page and remembers the intent in an intent frame', async () => {
    const authCalls = await signInAgainFrom('/intents?intent=abc')

    expect(authCalls).toEqual([[{ prompt: 'none' }]])
    expect(stored.get('pendingIntentId')).toBe('abc')
    expect(assign).toHaveBeenCalledWith(loginUrl.redirectTo)
  })

  it('keeps the regular sign in everywhere else', async () => {
    const authCalls = await signInAgainFrom('/calendar')

    expect(authCalls).toEqual([[{}]])
    expect(stored.has('pendingIntentId')).toBe(false)
    expect(assign).toHaveBeenCalledWith(loginUrl.redirectTo)
  })
})
