import { TwakeBarHeader } from '@common/components/TwakeBarHeader/TwakeBarHeader'
import { setAppLoading } from '@common/app/loadingSlice'
import '@testing-library/jest-dom'
import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

const mockIsInIframe = jest.fn()

jest.mock('cozy-external-bridge', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    isInIframe: mockIsInIframe
  }))
}))

const mockGetPlatformSdk = jest.fn()

jest.mock('@common/utils/sdkSession', () => ({
  getPlatformSdk: (platformURL: string): unknown =>
    mockGetPlatformSdk(platformURL)
}))

const mockTwakeBar = jest.fn()

// The bar itself is tested in its own package: only what calendar gives it
// matters here
jest.mock('@linagora/twake-bar', () => ({
  TWAKE_BAR_HEIGHT: '3rem',
  SdkProvider: ({ children }: { children: React.ReactNode }): JSX.Element => (
    <div data-testid="sdk-provider">{children}</div>
  ),
  TwakeBar: (props: unknown): JSX.Element => {
    mockTwakeBar(props)
    return <div data-testid="twake-bar" />
  }
}))

const userData = {
  sub: 'alice',
  email: 'alice@example.com',
  family_name: 'Doe',
  given_name: 'Alice',
  name: 'Alice',
  sid: 'sid',
  workplaceFqdn: 'alice.twake.app'
}

const renderBar = ({
  isLoading = false,
  user = userData
}: { isLoading?: boolean; user?: Partial<typeof userData> } = {}): ReturnType<
  typeof renderWithProviders
> =>
  renderWithProviders(<TwakeBarHeader />, {
    user: { userData: user, tokens: { id_token: 'the-id-token' } },
    loading: { isLoading }
  })

const getBarHeight = (): string =>
  document.documentElement.style.getPropertyValue('--twake-bar-height')

describe('TwakeBarHeader', () => {
  beforeEach(() => {
    mockIsInIframe.mockReturnValue(false)
    mockGetPlatformSdk.mockReturnValue({})
    window.appList = [{ name: 'Mail', link: '/mail', icon: 'mail.svg' }]
    window.SUPPORT_URL = 'https://support.example.com'
  })

  afterEach(() => {
    document.documentElement.style.removeProperty('--twake-bar-height')
    jest.clearAllMocks()
  })

  it('does nothing when embedded in an iframe', () => {
    mockIsInIframe.mockReturnValue(true)
    renderBar()

    expect(mockGetPlatformSdk).not.toHaveBeenCalled()
    expect(screen.queryByTestId('twake-bar')).toBe(null)
    expect(getBarHeight()).toBe('')
  })

  it("shows the bar on the user's platform once calendar has loaded", () => {
    const { store } = renderBar({ isLoading: true })

    expect(screen.queryByTestId('twake-bar')).toBe(null)
    expect(getBarHeight()).toBe('')

    act(() => {
      store.dispatch(setAppLoading(false))
    })

    expect(mockGetPlatformSdk).toHaveBeenCalledWith('https://alice.twake.app')
    expect(screen.getByTestId('sdk-provider')).toContainElement(
      screen.getByTestId('twake-bar')
    )
    expect(getBarHeight()).toBe('3rem')
  })

  it("gives the bar calendar's apps, user and help link to show off the platform", () => {
    renderBar()

    expect(mockTwakeBar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        app: expect.objectContaining({ slug: 'calendar' }),
        fallback: {
          helpLink: 'https://support.example.com',
          apps: [{ name: 'Mail', href: '/mail', icon: 'mail.svg' }],
          user: { name: 'Alice Doe', email: 'alice@example.com' }
        }
      })
    )
  })

  it('shows the bar off the platform without one', () => {
    renderBar({ user: { ...userData, workplaceFqdn: undefined } })

    expect(mockGetPlatformSdk).not.toHaveBeenCalled()
    expect(screen.getByTestId('twake-bar')).toBeInTheDocument()
    expect(screen.queryByTestId('sdk-provider')).toBe(null)
    expect(getBarHeight()).toBe('3rem')
  })

  it('gives the bar no user before the user is signed in', () => {
    renderBar({ user: {} })

    expect(mockTwakeBar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fallback: expect.objectContaining({ user: undefined })
      })
    )
  })
})
