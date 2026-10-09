import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { Menubar } from '@common/components/Menubar/Menubar'
import {
  TwakeBarProvider,
  useIsEmbedded
} from '@common/contexts/TwakeBarContext'
import { setAppLoading } from '@common/app/loadingSlice'
import { setTokens } from '@common/features/User/UserSlice'
import '@testing-library/jest-dom'
import { act, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../utils/Renderwithproviders'

const mockIsInIframe = jest.fn()

jest.mock('cozy-external-bridge', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    isInIframe: mockIsInIframe
  }))
}))

const BAR_SRC = 'https://bar.example.com/standalone-1.2.3.js'

const preloadedState = {
  user: {
    userData: {
      sub: 'alice',
      email: 'alice@example.com',
      family_name: 'Doe',
      name: 'Alice',
      sid: 'sid',
      workplaceFqdn: 'alice.twake.app'
    },
    tokens: { id_token: 'the-id-token' }
  }
}

const BarState = (): JSX.Element => (
  <span data-testid="bar-state">{useIsEmbedded() ? 'embedded' : 'off'}</span>
)

const renderApp = ({
  locale = 'fr',
  isLoading = false,
  idToken = 'the-id-token'
} = {}): ReturnType<typeof renderWithProviders> => {
  window.appList = [{ name: 'Mail', link: '/mail', icon: 'mail.svg' }]
  return renderWithProviders(
    <TwakeBarProvider locale={locale}>
      <BarState />
      <Menubar
        calendarRef={{ current: null }}
        onRefresh={() => {}}
        onToggleSidebar={() => {}}
        currentDate={new Date('2024-04-15')}
        currentView={CALENDAR_VIEWS.timeGridWeek}
      />
    </TwakeBarProvider>,
    {
      user: { ...preloadedState.user, tokens: { id_token: idToken } },
      loading: { isLoading }
    }
  )
}

const getBarScript = (): HTMLScriptElement | null =>
  document.head.querySelector(`script[src="${BAR_SRC}"]`)

const fireScriptEvent = async (type: 'load' | 'error'): Promise<void> => {
  const script = getBarScript()
  if (!script) throw new Error('The bar script was not injected')
  await act(async () => {
    script.dispatchEvent(new Event(type))
    await Promise.resolve()
  })
}

const getBarHeight = (): string =>
  document.documentElement.style.getPropertyValue('--twake-bar-height')

const expectCalendarTopBar = (): void => {
  expect(screen.getByTestId('bar-state')).toHaveTextContent('off')
  expect(getBarHeight()).toBe('')
  expect(screen.queryByAltText('menubar.logoAlt')).toBeInTheDocument()
  expect(screen.queryByLabelText('menubar.apps')).toBeInTheDocument()
}

const flushPromises = (): Promise<void> =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })

describe('TwakeBarProvider', () => {
  const mount = jest.fn()
  const unmount = jest.fn()
  const setCredentials = jest.fn()
  const setLocale = jest.fn()
  const exposeBar = (): void => {
    window.TwakeBar = { mount, unmount, setCredentials, setLocale }
  }

  beforeEach(() => {
    mockIsInIframe.mockReturnValue(false)
    mount.mockResolvedValue(undefined)
    unmount.mockResolvedValue(undefined)
    setCredentials.mockResolvedValue(undefined)
    setLocale.mockResolvedValue(undefined)
    window.TWAKE_BAR_URL = BAR_SRC
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    getBarScript()?.remove()
    delete window.TwakeBar
    window.TWAKE_BAR_URL = undefined
    window.TWAKE_BAR_INTEGRITY = undefined
    document.documentElement.style.removeProperty('--twake-bar-height')
    jest.clearAllMocks()
  })

  it('does nothing without TWAKE_BAR_URL', () => {
    window.TWAKE_BAR_URL = undefined
    renderApp()

    expect(getBarScript()).toBe(null)
    expectCalendarTopBar()
  })

  it('does nothing when embedded in an iframe', () => {
    mockIsInIframe.mockReturnValue(true)
    renderApp()

    expect(getBarScript()).toBe(null)
    // The workplace around calendar provides the top bar
    expect(screen.getByTestId('bar-state')).toHaveTextContent('embedded')
  })

  it("mounts the bar with the user's id token", async () => {
    renderApp()
    exposeBar()
    await fireScriptEvent('load')

    await waitFor(() =>
      expect(screen.getByTestId('bar-state')).toHaveTextContent('embedded')
    )
    expect(mount).toHaveBeenCalledWith(
      expect.objectContaining({
        appSlug: 'calendar',
        appName: 'Twake Calendar',
        locale: 'fr',
        onLogOut: expect.any(Function),
        idToken: 'the-id-token',
        cozyURL: 'https://alice.twake.app'
      })
    )
    expect(setCredentials).not.toHaveBeenCalled()
    expect(getBarHeight()).toBe('3rem')
    expect(screen.queryByAltText('menubar.logoAlt')).toBe(null)
    expect(screen.queryByLabelText('menubar.apps')).toBe(null)
    expect(screen.queryByLabelText('menubar.userProfile')).toBe(null)
    expect(screen.queryByLabelText('menubar.settings')).toBeInTheDocument()
  })

  it('checks the integrity of the script when given', () => {
    window.TWAKE_BAR_INTEGRITY = 'sha384-abc'
    renderApp()

    expect(getBarScript()?.integrity).toBe('sha384-abc')
    expect(getBarScript()?.crossOrigin).toBe('anonymous')
  })

  it("waits for calendar's loader to be gone before showing the bar", async () => {
    const { store } = renderApp({ isLoading: true })
    exposeBar()
    await fireScriptEvent('load')
    await flushPromises()

    expect(mount).not.toHaveBeenCalled()
    expectCalendarTopBar()

    act(() => {
      store.dispatch(setAppLoading(false))
    })

    expect(mount).toHaveBeenCalled()
    expect(screen.getByTestId('bar-state')).toHaveTextContent('embedded')
    expect(getBarHeight()).toBe('3rem')
  })

  it("gives calendar's new locale to the mounted bar", async () => {
    const { rerender } = renderApp({ locale: 'en' })
    exposeBar()
    await fireScriptEvent('load')
    await waitFor(() =>
      expect(mount).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'en' })
      )
    )

    rerender(<TwakeBarProvider locale="vi">{null}</TwakeBarProvider>)
    expect(setLocale).toHaveBeenLastCalledWith('vi')
  })

  it('gives the renewed id token to the mounted bar', async () => {
    const { store } = renderApp()
    exposeBar()
    await fireScriptEvent('load')
    await waitFor(() => expect(mount).toHaveBeenCalled())
    expect(setCredentials).not.toHaveBeenCalled()

    act(() => {
      store.dispatch(setTokens({ id_token: 'the-renewed-id-token' }))
    })

    await waitFor(() =>
      expect(setCredentials).toHaveBeenCalledWith({
        idToken: 'the-renewed-id-token',
        cozyURL: 'https://alice.twake.app'
      })
    )
  })

  it('gives calendar its top bar back when the bar fails', async () => {
    mount.mockRejectedValue(new Error('token exchange failed: 400'))
    renderApp()
    exposeBar()
    await fireScriptEvent('load')
    await flushPromises()

    expect(mount).toHaveBeenCalledTimes(1)
    expect(unmount).toHaveBeenCalled()
    expectCalendarTopBar()
  })

  it('keeps the calendar top bar when the script cannot be loaded', async () => {
    renderApp()
    await fireScriptEvent('error')

    expect(mount).not.toHaveBeenCalled()
    expectCalendarTopBar()
  })

  it('keeps the calendar top bar when the script does not expose the bar', async () => {
    renderApp()
    await fireScriptEvent('load')
    await flushPromises()

    expectCalendarTopBar()
  })

  it('keeps the calendar top bar when mounting throws', async () => {
    renderApp()
    window.TwakeBar = {
      mount: (): never => {
        throw new Error('broken')
      },
      unmount,
      setCredentials,
      setLocale
    }
    await fireScriptEvent('load')
    await flushPromises()

    expect(unmount).toHaveBeenCalled()
    expectCalendarTopBar()
  })
})
