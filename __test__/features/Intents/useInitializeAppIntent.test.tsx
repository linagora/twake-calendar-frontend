import { setupStore } from '@common/app/store'
import * as oidcAuth from '@common/features/User/oidcAuth'
import { useInitializeApp } from '@common/features/User/useInitializeApp'
import * as apiUtils from '@common/utils/apiUtils'
import { renderHook, waitFor } from '@testing-library/react'
import React, { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'

const loginUrlMock = {
  code_verifier: 'verifier123',
  state: 'state123',
  redirectTo: new URL('http://login.url')
}

const renderInitializeApp = (): void => {
  const store = setupStore({
    user: {
      userData: null,
      tokens: null,
      loading: false,
      error: null,
      coreConfig: { language: 'en' }
    },
    calendars: { list: {}, pending: false, error: null }
  })
  const wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <Provider store={store}>{children}</Provider>
  )
  renderHook(() => useInitializeApp(), { wrapper })
}

describe('useInitializeApp on the intent route', () => {
  let pendingIntentIdWhenAuthCalled: string | null

  beforeEach(() => {
    jest.clearAllMocks()
    pendingIntentIdWhenAuthCalled = null
    sessionStorage.clear()
    jest.spyOn(apiUtils, 'redirectTo').mockImplementation(() => {})
    jest.spyOn(oidcAuth, 'Auth').mockImplementation(() => {
      pendingIntentIdWhenAuthCalled = sessionStorage.getItem('pendingIntentId')
      return Promise.resolve(loginUrlMock)
    })
  })

  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('signs in without any SSO page and remembers the intent', async () => {
    window.history.pushState({}, '', '/intents?intent=abc')

    renderInitializeApp()

    await waitFor(() =>
      expect(oidcAuth.Auth).toHaveBeenCalledWith({ prompt: 'none' })
    )
    // remembered before leaving for the SSO, or the callback loses the intent
    expect(pendingIntentIdWhenAuthCalled).toBe('abc')
    await waitFor(() =>
      expect(apiUtils.redirectTo).toHaveBeenCalledWith(loginUrlMock.redirectTo)
    )
  })

  it('keeps the regular sign in everywhere else', async () => {
    window.history.pushState({}, '', '/calendar')

    renderInitializeApp()

    await waitFor(() => expect(oidcAuth.Auth).toHaveBeenCalledWith({}))
    expect(sessionStorage.getItem('pendingIntentId')).toBe(null)
  })

  it('forgets an intent left pending by a frame closed mid sign in', async () => {
    sessionStorage.setItem('pendingIntentId', 'stale')
    window.history.pushState({}, '', '/calendar')

    renderInitializeApp()

    await waitFor(() => expect(oidcAuth.Auth).toHaveBeenCalledWith({}))
    expect(pendingIntentIdWhenAuthCalled).toBe(null)
    expect(sessionStorage.getItem('pendingIntentId')).toBe(null)
  })
})
