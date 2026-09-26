import * as appHooks from '@common/app/hooks'
import { AppDispatch, setupStore } from '@common/app/store'
import HandleLogin from '@private/features/User/HandleLogin'
import * as oidcAuth from '@common/features/User/oidcAuth'
import { clientConfig } from '@common/features/User/oidcAuth'
import { useInitializeApp } from '@common/features/User/useInitializeApp'
import * as apiUtils from '@common/utils/apiUtils'
import { renderHook, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { push } from 'redux-first-history'
import { renderWithProviders } from '../../utils/Renderwithproviders'

clientConfig.url = 'https://example.com'

describe('HandleLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(apiUtils, 'redirectTo').mockImplementation(() => {})
    const dispatch = jest.fn() as AppDispatch
    jest.spyOn(appHooks, 'useAppDispatch').mockReturnValue(dispatch)
    sessionStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    })
  })

  test('redirects and sets sessionStorage when no userData', async () => {
    const loginUrlMock = {
      code_verifier: 'verifier123',
      state: 'state123',
      redirectTo: new URL('http://login.url')
    }

    jest.spyOn(oidcAuth, 'Auth').mockResolvedValue(loginUrlMock)

    const { result } = renderHook(() => useInitializeApp(), {
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

    await waitFor(
      () => {
        expect(oidcAuth.Auth).toHaveBeenCalled()
      },
      { timeout: 3000 }
    )

    await waitFor(
      () => {
        expect(sessionStorage.getItem('redirectState')).toEqual(
          JSON.stringify({
            code_verifier: 'verifier123',
            state: 'state123'
          })
        )
      },
      { timeout: 3000 }
    )

    await waitFor(
      () => {
        expect(apiUtils.redirectTo).toHaveBeenCalledWith(
          loginUrlMock.redirectTo
        )
      },
      { timeout: 3000 }
    )
  })

  test('does not reload the user when the user data changes while calendars are pending', () => {
    // a zone or a language picked in the settings rewrites the user data; a reload
    // fired then races the write and its stale answer undoes the pick
    sessionStorage.setItem('tokenSet', JSON.stringify({ access_token: 'test' }))
    sessionStorage.setItem('userData', JSON.stringify({ sub: 'test' }))
    jest.spyOn(oidcAuth, 'Auth')
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
    expect(oidcAuth.Auth).not.toHaveBeenCalled()
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
    const mockDispatch = jest.fn()
    jest.spyOn(appHooks, 'useAppDispatch').mockReturnValue(mockDispatch)
    jest.spyOn(oidcAuth, 'Auth').mockResolvedValue({
      code_verifier: 'verifier123',
      state: 'state123',
      redirectTo: new URL('http://login.url')
    })

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
    const mockDispatch = jest.fn()
    jest.spyOn(appHooks, 'useAppDispatch').mockReturnValue(mockDispatch)

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
