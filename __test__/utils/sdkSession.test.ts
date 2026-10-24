import type * as SdkSession from '@common/utils/sdkSession'

const mockCreateSdk = jest.fn()

jest.mock('@linagora/twake-sdk', () => ({
  createSdk: (options: unknown): unknown => mockCreateSdk(options)
}))

// Like the SDK client, a successful login makes the client ready
const makeSdk = (
  login: () => Promise<void> = () => Promise.resolve()
): { status: string; login: jest.Mock } => {
  const sdk = {
    status: 'waiting',
    login: jest.fn(async () => {
      await login()
      sdk.status = 'ready'
    })
  }
  return sdk
}

describe('ensureSdkSignedIn', () => {
  let ensureSdkSignedIn: typeof SdkSession.ensureSdkSignedIn
  let getPlatformSdk: typeof SdkSession.getPlatformSdk

  // The session lives in the module: each test starts from a fresh one
  beforeEach(() => {
    mockCreateSdk.mockReset()
    jest.isolateModules(() => {
      ;({ ensureSdkSignedIn, getPlatformSdk } = jest.requireActual<
        typeof SdkSession
      >('@common/utils/sdkSession'))
    })
  })

  it('gives the client of the session before it is signed in', async () => {
    const sdk = makeSdk()
    mockCreateSdk.mockReturnValue(sdk)

    expect(getPlatformSdk('https://alice.example.com')).toBe(sdk)
    expect(sdk.login).not.toHaveBeenCalled()

    await ensureSdkSignedIn('https://alice.example.com', 'token')

    expect(mockCreateSdk).toHaveBeenCalledTimes(1)
    expect(getPlatformSdk('https://alice.example.com')).toBe(sdk)
  })

  it("signs the client of the user's platform in with the id token", async () => {
    const sdk = makeSdk()
    mockCreateSdk.mockReturnValue(sdk)

    const client = await ensureSdkSignedIn('https://alice.example.com', 'token')

    expect(client).toBe(sdk)
    expect(mockCreateSdk).toHaveBeenCalledWith({
      platformURL: 'https://alice.example.com'
    })
    expect(sdk.login).toHaveBeenCalledWith('token')
  })

  it('keeps the signed in client for the next calls', async () => {
    const sdk = makeSdk()
    mockCreateSdk.mockReturnValue(sdk)

    await ensureSdkSignedIn('https://alice.example.com', 'token')
    const client = await ensureSdkSignedIn(
      'https://alice.example.com',
      'expired'
    )

    expect(client).toBe(sdk)
    expect(mockCreateSdk).toHaveBeenCalledTimes(1)
    expect(sdk.login).toHaveBeenCalledTimes(1)
  })

  it('shares one token exchange between concurrent calls', async () => {
    let finishLogin!: () => void
    const sdk = makeSdk(
      () =>
        new Promise<void>(resolve => {
          finishLogin = resolve
        })
    )
    mockCreateSdk.mockReturnValue(sdk)

    const first = ensureSdkSignedIn('https://alice.example.com', 'token')
    const second = ensureSdkSignedIn('https://alice.example.com', 'token')
    finishLogin()

    expect(await first).toBe(sdk)
    expect(await second).toBe(sdk)
    expect(sdk.login).toHaveBeenCalledTimes(1)
  })

  it('signs in again after a failed exchange', async () => {
    const sdk = makeSdk()
    sdk.login.mockRejectedValueOnce(new Error('token_exchange failed'))
    mockCreateSdk.mockReturnValue(sdk)

    await expect(
      ensureSdkSignedIn('https://alice.example.com', 'token')
    ).rejects.toThrow('token_exchange failed')
    await ensureSdkSignedIn('https://alice.example.com', 'token')

    expect(sdk.login).toHaveBeenCalledTimes(2)
    expect(sdk.status).toBe('ready')
  })
})
