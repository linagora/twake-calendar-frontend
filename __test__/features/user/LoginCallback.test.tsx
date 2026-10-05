import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData
} from '@common/features/User/UserSlice'
import { CallbackResume } from '@private/features/User/LoginCallback'
import { completeLogin } from '@linagora/twake-oidc'
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

jest.mock('@linagora/twake-oidc', () => ({
  completeLogin: jest.fn()
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

  it('should complete the sign-in and dispatch necessary actions', async () => {
    const mockTokenSet = { access_token: 'abc' }
    const mockUserInfo = { name: 'Test User' }

    const mockData = {
      tokenSet: mockTokenSet,
      userinfo: mockUserInfo,
      returnTo: '/calendar'
    }

    ;(completeLogin as jest.Mock).mockResolvedValue(mockData)

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
    ;(completeLogin as jest.Mock).mockResolvedValue(null)
    renderWithProviders(<CallbackResume />)

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(replace('/'))
    })
  })
})
