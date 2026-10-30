import type { Mock } from 'vitest'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData
} from '@common/features/User/UserSlice'
import { twakeSpace } from '@common/features/Embed/twakeSpace'
import { CallbackResume } from '@private/features/User/LoginCallback'
import { completeLogin, LoginRequiredError } from '@linagora/twake-oidc'
import { render, screen, waitFor } from '@testing-library/react'
import { replace } from 'redux-first-history'
import { renderWithProviders } from '../../utils/Renderwithproviders'

// Mocks
vi.mock('@common/app/hooks', () => ({
  useAppDispatch: vi.fn(),
  useAppSelector: vi.fn(() => ({
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

vi.mock('@linagora/twake-oidc', async () => ({
  ...(await vi.importActual('@linagora/twake-oidc')),
  completeLogin: vi.fn(),
  LoginRequiredError: class extends Error {
    constructor(readonly returnTo: string) {
      super('The SSO needs the user to sign in')
    }
  }
}))

vi.mock('@common/features/Embed/twakeSpace', () => ({
  twakeSpace: { notifyLoginRequired: vi.fn() }
}))

vi.mock('@common/features/User/UserSlice', async () => {
  const mockGetUser = Object.assign(
    vi.fn(() => ({ type: 'GET_USER_ID' })),
    {
      pending: { type: 'GET_USER_ID/pending' },
      fulfilled: { type: 'GET_USER_ID/fulfilled' },
      rejected: { type: 'GET_USER_ID/rejected' }
    }
  )

  return {
    ...(await vi.importActual('@common/features/User/UserSlice')),
    setUserData: vi.fn(data => ({ type: 'SET_USER', payload: data })),
    setTokens: vi.fn(tokens => ({ type: 'SET_TOKENS', payload: tokens })),
    getOpenPaasUserData: mockGetUser
  }
})

vi.mock('@common/features/Calendars/CalendarSlice', async () => {
  const mockGetCalendars = Object.assign(
    vi.fn(() => ({ type: 'GET_CALENDARS' })),
    {
      pending: { type: 'GET_CALENDARS/pending' },
      fulfilled: { type: 'GET_CALENDARS/fulfilled' },
      rejected: { type: 'GET_CALENDARS/rejected' }
    }
  )

  return {
    ...(await vi.importActual('@common/features/Calendars/CalendarSlice')),
    getCalendarsList: mockGetCalendars
  }
})

describe('CallbackResume', () => {
  const dispatch = vi.fn()
  let mockUserState: any
  let mockCalendarsState: any

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAppDispatch as unknown as Mock).mockReturnValue(dispatch)

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
    ;(useAppSelector as Mock).mockImplementation(selector => {
      const state = {
        user: mockUserState,
        calendars: mockCalendarsState
      }
      return selector(state)
    })
  })

  it('should complete the sign-in and dispatch necessary actions', async () => {
    const mockTokenSet = { access_token: 'abc' }
    const mockUserInfo = { name: 'Test User' }

    const mockData = {
      tokenSet: mockTokenSet,
      userinfo: mockUserInfo,
      returnTo: '/calendar'
    }

    ;(completeLogin as Mock).mockResolvedValue(mockData)

    const { rerender } = render(<CallbackResume />)

    await waitFor(() => {
      expect(completeLogin).toHaveBeenCalled()
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
    // The tokens are handed to the API client, never to web storage
    expect(sessionStorage.getItem('tokenSet')).toBeNull()
    expect(sessionStorage.getItem('userData')).toBeNull()
  })

  it('should go home when no sign-in is pending', async () => {
    ;(completeLogin as Mock).mockResolvedValue(null)
    renderWithProviders(<CallbackResume />)

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(replace('/'))
    })
  })

  it('returns to the embed route the sign in started from', async () => {
    const mockTokenSet = { access_token: 'abc' }
    const mockUserInfo = { name: 'Test User' }
    ;(completeLogin as Mock).mockResolvedValue({
      tokenSet: mockTokenSet,
      userinfo: mockUserInfo,
      returnTo: '/embed/calendars/team1'
    })

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
    ;(completeLogin as Mock).mockRejectedValue(
      new LoginRequiredError('/embed/calendars/team1')
    )

    renderWithProviders(<CallbackResume />)

    expect(await screen.findByText('embed.signInRequired')).toBeInTheDocument()
    expect(twakeSpace?.notifyLoginRequired).toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalledWith(replace('/error'))
  })
})
