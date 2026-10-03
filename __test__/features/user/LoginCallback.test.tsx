import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import { prepareIntentLogin } from '@common/features/Intents/pendingIntent'
import * as oidcAuth from '@common/features/User/oidcAuth'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData
} from '@common/features/User/UserSlice'
import { CallbackResume } from '@private/features/User/LoginCallback'
import { getAccessToken } from '@common/utils/apiUtils'
import { render, waitFor } from '@testing-library/react'
import { replace } from 'redux-first-history'
import { renderWithProviders } from '../../utils/Renderwithproviders'

// Mocks
jest.mock('@common/app/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(() => ({
    user: {
      userData: null,
      tokens: null,
      loading: false,
      error: null
    },
    calendars: {
      list: {},
      pending: false,
      error: null
    }
  }))
}))

jest.mock('@common/features/User/oidcAuth', () => ({
  Callback: jest.fn()
}))

jest.mock('@common/features/User/UserSlice', () => {
  const mockGetUser = Object.assign(
    jest.fn(() => ({ type: 'GET_USER_ID' })),
    {
      pending: { type: 'GET_USER_ID/pending' },
      fulfilled: { type: 'GET_USER_ID/fulfilled' },
      rejected: { type: 'GET_USER_ID/rejected' }
    }
  )

  return {
    ...jest.requireActual('@common/features/User/UserSlice'),
    setUserData: jest.fn(data => ({ type: 'SET_USER', payload: data })),
    setTokens: jest.fn(tokens => ({ type: 'SET_TOKENS', payload: tokens })),
    getOpenPaasUserData: mockGetUser
  }
})

jest.mock('@common/features/Calendars/CalendarSlice', () => {
  const mockGetCalendars = Object.assign(
    jest.fn(() => ({ type: 'GET_CALENDARS' })),
    {
      pending: { type: 'GET_CALENDARS/pending' },
      fulfilled: { type: 'GET_CALENDARS/fulfilled' },
      rejected: { type: 'GET_CALENDARS/rejected' }
    }
  )

  return {
    ...jest.requireActual('@common/features/Calendars/CalendarSlice'),
    getCalendarsList: mockGetCalendars
  }
})

describe('CallbackResume', () => {
  const dispatch = jest.fn()
  let mockUserState: any
  let mockCalendarsState: any

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAppDispatch as unknown as jest.Mock).mockReturnValue(dispatch)

    // Initialize mock states
    mockUserState = {
      userData: null,
      tokens: null,
      loading: false,
      error: null
    }
    mockCalendarsState = {
      list: {},
      pending: false,
      error: null
    }
    ;(useAppSelector as jest.Mock).mockImplementation(selector => {
      const state = {
        user: mockUserState,
        calendars: mockCalendarsState
      }
      return selector(state)
    })
  })

  it('should call Callback and dispatch necessary actions', async () => {
    const mockTokenSet = { access_token: 'abc' }
    const mockUserInfo = { name: 'Test User' }

    const mockData = {
      tokenSet: mockTokenSet,
      userinfo: mockUserInfo
    }

    ;(oidcAuth.Callback as jest.Mock).mockResolvedValue(mockData)

    sessionStorage.setItem(
      'redirectState',
      JSON.stringify({ code_verifier: 'verifier123', state: 'state456' })
    )

    const { rerender } = render(<CallbackResume />)

    await waitFor(() => {
      expect(oidcAuth.Callback).toHaveBeenCalledWith('verifier123', 'state456')
    })
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(setAppLoading(true))
    })
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(setUserData(mockUserInfo))
    })
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(setTokens(mockTokenSet))
    })
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(getOpenPaasUserData())
    })
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(getCalendarsList())
    })

    // Simulate async actions completing by updating mock state
    mockUserState = {
      userData: mockUserInfo,
      tokens: mockTokenSet,
      loading: false,
      error: null
    }
    mockCalendarsState = {
      list: { calendar1: {} },
      pending: false,
      error: null
    }

    // Re-render to trigger navigation effect
    rerender(<CallbackResume />)

    await waitFor(
      () => {
        expect(dispatch).toHaveBeenCalledWith(setAppLoading(false))
      },
      { timeout: 3000 }
    )
    await waitFor(
      () => {
        expect(dispatch).toHaveBeenCalledWith(replace('/calendar'))
      },
      { timeout: 3000 }
    )
    await waitFor(() => {
      expect(sessionStorage.getItem('redirectState')).toBe(null)
    })
    // The tokens are handed to the API client, never to web storage
    expect(getAccessToken()).toBe('abc')
    expect(sessionStorage.getItem('tokenSet')).toBeNull()
    expect(sessionStorage.getItem('userData')).toBeNull()
  })

  it('should handle missing redirectState gracefully', async () => {
    sessionStorage.removeItem('redirectState')
    renderWithProviders(<CallbackResume />)

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(replace('/'))
    })
  })

  it('resumes the pending intent once signed in', async () => {
    sessionStorage.clear()
    ;(oidcAuth.Callback as jest.Mock).mockResolvedValue({
      tokenSet: { access_token: 'abc' },
      userinfo: { name: 'Test User' }
    })
    sessionStorage.setItem(
      'redirectState',
      JSON.stringify({ code_verifier: 'verifier123', state: 'state456' })
    )
    sessionStorage.setItem('pendingIntentId', 'intent-1')

    const { rerender } = render(<CallbackResume />)
    await waitFor(() => expect(oidcAuth.Callback).toHaveBeenCalled())

    mockUserState = {
      userData: { name: 'Test User' },
      tokens: { access_token: 'abc' },
      loading: false,
      error: null
    }
    rerender(<CallbackResume />)

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(replace('/intents?intent=intent-1'))
    )
    expect(dispatch).not.toHaveBeenCalledWith(replace('/calendar'))
    expect(sessionStorage.getItem('pendingIntentId')).toBe(null)
  })

  it('lands on the calendar after a regular sign in despite a stale intent', async () => {
    sessionStorage.clear()
    // An intent frame closed mid sign in left its intent pending
    sessionStorage.setItem('pendingIntentId', 'stale')
    window.history.pushState({}, '', '/calendar')
    try {
      prepareIntentLogin()
    } finally {
      window.history.pushState({}, '', '/')
    }
    ;(oidcAuth.Callback as jest.Mock).mockResolvedValue({
      tokenSet: { access_token: 'abc' },
      userinfo: { name: 'Test User' }
    })
    sessionStorage.setItem(
      'redirectState',
      JSON.stringify({ code_verifier: 'verifier123', state: 'state456' })
    )

    const { rerender } = render(<CallbackResume />)
    await waitFor(() => expect(oidcAuth.Callback).toHaveBeenCalled())

    mockUserState = {
      userData: { name: 'Test User' },
      tokens: { access_token: 'abc' },
      loading: false,
      error: null
    }
    rerender(<CallbackResume />)

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(replace('/calendar'))
    )
    expect(dispatch).not.toHaveBeenCalledWith(replace('/intents?intent=stale'))
  })

  it('sends an SSO error back to the pending intent', async () => {
    sessionStorage.clear()
    window.history.pushState(
      {},
      '',
      '/callback?error=login_required&state=state456'
    )
    try {
      sessionStorage.setItem(
        'redirectState',
        JSON.stringify({ code_verifier: 'verifier123', state: 'state456' })
      )
      sessionStorage.setItem('pendingIntentId', 'intent-1')

      render(<CallbackResume />)

      await waitFor(() =>
        expect(dispatch).toHaveBeenCalledWith(
          replace('/intents?intent=intent-1&authError=login_required')
        )
      )
      expect(oidcAuth.Callback).not.toHaveBeenCalled()
      expect(dispatch).not.toHaveBeenCalledWith(replace('/error'))
      expect(sessionStorage.getItem('redirectState')).toBe(null)
    } finally {
      window.history.pushState({}, '', '/')
    }
  })
})
