import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import * as oidcAuth from '@common/features/User/oidcAuth'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData
} from '@common/features/User/UserSlice'
import { twakeSpace } from '@common/features/Embed/twakeSpace'
import { CallbackResume } from '@private/features/User/LoginCallback'
import { getAccessToken } from '@common/utils/apiUtils'
import { render, screen, waitFor } from '@testing-library/react'
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

jest.mock('@common/features/Embed/twakeSpace', () => ({
  twakeSpace: { notifyLoginRequired: jest.fn() }
}))

jest.mock('@common/features/User/oidcAuth', () => ({
  Callback: jest.fn(),
  isSilentLoginRefused: jest.fn(() => false)
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

  it('returns to the embed route the sign in started from', async () => {
    const mockTokenSet = { access_token: 'abc' }
    const mockUserInfo = { name: 'Test User' }
    ;(oidcAuth.Callback as jest.Mock).mockResolvedValue({
      tokenSet: mockTokenSet,
      userinfo: mockUserInfo
    })
    sessionStorage.setItem(
      'redirectState',
      JSON.stringify({
        code_verifier: 'verifier123',
        state: 'state456',
        returnTo: '/embed/calendars/team1'
      })
    )

    const { rerender } = render(<CallbackResume />)
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(getCalendarsList())
    })

    mockUserState = { ...mockUserState, userData: mockUserInfo }
    mockUserState.tokens = mockTokenSet
    rerender(<CallbackResume />)

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(replace('/embed/calendars/team1'))
    })
  })

  it('shows an error when the SSO refuses the silent sign in', async () => {
    ;(oidcAuth.isSilentLoginRefused as jest.Mock).mockReturnValueOnce(true)
    sessionStorage.setItem(
      'redirectState',
      JSON.stringify({
        code_verifier: 'verifier123',
        state: 'state456',
        returnTo: '/embed/calendars/team1'
      })
    )

    renderWithProviders(<CallbackResume />)

    expect(await screen.findByText('embed.signInRequired')).toBeInTheDocument()
    expect(twakeSpace?.notifyLoginRequired).toHaveBeenCalled()
    expect(oidcAuth.Callback).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalledWith(replace('/error'))
  })

  it('should handle missing redirectState gracefully', async () => {
    sessionStorage.removeItem('redirectState')
    renderWithProviders(<CallbackResume />)

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(replace('/'))
    })
  })
})
