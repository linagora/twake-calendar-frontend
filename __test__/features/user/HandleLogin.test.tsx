import type { Mock } from 'vitest'
import * as appHooks from '@common/app/hooks'
import { AppDispatch, setupStore } from '@common/app/store'
import HandleLogin from '@private/features/User/HandleLogin'
import {
  SSO_UNREACHABLE_ERROR,
  useInitializeApp
} from '@common/features/User/useInitializeApp'
import { startLogin } from '@linagora/twake-oidc'
import { getRetryDelay } from '@linagora/twake-websocket'
import { setUserError } from '@common/features/User/UserSlice'

import { renderHook, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { push } from 'redux-first-history'
import { renderWithProviders } from '../../utils/Renderwithproviders'

vi.mock('@linagora/twake-websocket', () => ({
  __esModule: true,
  getRetryDelay: vi.fn(),
  assertWebSocketAlive: vi.fn()
}))

vi.mock('@linagora/twake-oidc', async () => ({
  ...(await vi.importActual('@linagora/twake-oidc')),
  startLogin: vi.fn()
}))

describe('HandleLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(startLogin as Mock).mockReset()
    const dispatch = vi.fn() as AppDispatch
    vi.spyOn(appHooks, 'useAppDispatch').mockReturnValue(dispatch)
    sessionStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
  })

  test('signs in through the SSO when no userData', async () => {
    renderHook(() => useInitializeApp(), {
      wrapper: ({ children }) => (
        <Provider
          store={setupStore({
            user: {
              userData: null,
              tokens: null,
              loading: false,
              error: null,
              coreConfig: { language: 'en' }
            },
            calendars: { list: {}, pending: false, error: null }
          })}
        >
          {children}
        </Provider>
      )
    })

    await waitFor(() => {
      expect(startLogin).toHaveBeenCalled()
    })
  })

  describe('when the SSO cannot be reached', () => {
    const renderWithoutSession = () =>
      renderHook(() => useInitializeApp(), {
        wrapper: ({ children }) => (
          <Provider
            store={setupStore({
              user: {
                userData: null,
                tokens: null,
                loading: false,
                error: null,
                coreConfig: { language: 'en' }
              },
              calendars: { list: {}, pending: false, error: null }
            })}
          >
            {children}
          </Provider>
        )
      })

    beforeEach(() => {
      ;(getRetryDelay as Mock).mockReturnValue(0)
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    test('tries again and redirects once it answers', async () => {
      ;(startLogin as Mock)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValue(undefined)

      renderWithoutSession()

      await waitFor(() => expect(startLogin).toHaveBeenCalledTimes(2))
    })

    test('shows the error page when it never answers', async () => {
      ;(startLogin as Mock).mockRejectedValue(new TypeError('Failed to fetch'))
      const dispatch = appHooks.useAppDispatch()

      renderWithoutSession()

      await waitFor(() => expect(dispatch).toHaveBeenCalledWith(push('/error')))
      expect(dispatch).toHaveBeenCalledWith(setUserError(SSO_UNREACHABLE_ERROR))
      expect(startLogin).toHaveBeenCalledTimes(3)
    })
  })

  test('does not reload the user when the user data changes while calendars are pending', () => {
    // a zone or a language picked in the settings rewrites the user data; a reload
    // fired then races the write and its stale answer undoes the pick
    sessionStorage.setItem('tokenSet', JSON.stringify({ access_token: 'test' }))
    sessionStorage.setItem('userData', JSON.stringify({ sub: 'test' }))
    const dispatch = appHooks.useAppDispatch()

    renderHook(() => useInitializeApp(), {
      wrapper: ({ children }) => (
        <Provider
          store={setupStore({
            user: {
              userData: { sub: 'test', email: 'test@test.com' },
              tokens: { access_token: 'test' },
              loading: false,
              error: null,
              coreConfig: { language: 'en' }
            },
            calendars: { list: {}, pending: true, error: null }
          })}
        >
          {children}
        </Provider>
      )
    })

    expect(dispatch).not.toHaveBeenCalled()
    expect(startLogin).not.toHaveBeenCalled()
  })

  test('does not render loading element when userData exists and calendars pending is true', () => {
    const preloadedState = {
      user: {
        userData: {
          sub: 'test',
          email: 'test@test.com',
          sid: 'aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro',
          openpaasId: '667037022b752d0026472254'
        },
        tokens: { access_token: 'test' },
        loading: false
      },
      calendars: { list: {}, pending: true },
      loading: { isLoading: true }
    }

    renderWithProviders(<HandleLogin />, preloadedState)
    // HandleLogin now returns null, loading is shown at App level via appLoading state
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
  })
  test('does not render loading element when userData exists and calendars pending is false', () => {
    const preloadedState = {
      user: {
        userData: {
          sub: 'cmoussu',
          email: 'cmoussu@linagora.com',
          sid: 'aiYbWZSk2g0F+LrQeD7Dg4QcUMR8R/zTZdZBiA7N6Ro',
          openpaasId: '667037022b752d0026472254'
        },
        tokens: { access_token: 'test' },
        loading: false
      },
      calendars: { list: {}, pending: false },
      loading: { isLoading: false }
    }
    renderWithProviders(<HandleLogin />, preloadedState)

    // HandleLogin now returns null, loading is shown at App level via appLoading state
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
  })
  test('goes to error page when there is error in user data', async () => {
    const mockDispatch = vi.fn()
    vi.spyOn(appHooks, 'useAppDispatch').mockReturnValue(mockDispatch)

    renderWithProviders(<HandleLogin />, {
      user: {
        error: true,
        loading: false,
        userData: {
          sub: 'test',
          email: 'test@test.com',
          sid: 'testSid',
          openpaasId: 'testId'
        },
        tokens: { access_token: 'test' }
      },
      calendars: {
        list: {},
        pending: false,
        error: null
      }
    })

    await waitFor(
      () => {
        expect(mockDispatch).toHaveBeenCalledWith(push('/error'))
      },
      { timeout: 3000 }
    )
  })

  test('goes to the calendar page when only the calendars failed to load', async () => {
    const mockDispatch = vi.fn()
    vi.spyOn(appHooks, 'useAppDispatch').mockReturnValue(mockDispatch)

    renderWithProviders(<HandleLogin />, {
      user: {
        error: null,
        loading: false,
        userData: {
          sub: 'test',
          email: 'test@test.com',
          sid: 'testSid',
          openpaasId: 'testId'
        },
        tokens: { access_token: 'test' }
      },
      calendars: {
        list: {},
        pending: false,
        error: 'TRANSLATION:error.calendarsNotFound'
      }
    })

    await waitFor(
      () => {
        expect(mockDispatch).toHaveBeenCalledWith(push('/calendar'))
      },
      { timeout: 3000 }
    )
    expect(mockDispatch).not.toHaveBeenCalledWith(push('/error'))
  })
})
