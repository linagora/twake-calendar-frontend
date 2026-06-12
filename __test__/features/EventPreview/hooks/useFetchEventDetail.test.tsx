import { renderHook, waitFor } from '@testing-library/react'
import { useFetchEventDetail } from '@public/features/EventPreview/hooks/useFetchEventDetail'
import { fetchEvent } from '@public/features/EventPreview/EventDao'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import React from 'react'
import { I18nContext } from 'twake-i18n'
import { HTTPError } from 'ky'

jest.mock('@public/features/EventPreview/EventDao', () => ({
  fetchEvent: jest.fn()
}))

jest.mock('@common/features/Events/transformers/parseFetchedEvent', () => ({
  parseFetchedEvent: jest.fn()
}))

const mockFetchEvent = fetchEvent as jest.Mock
const mockParseFetchedEvent = parseFetchedEvent as jest.Mock

describe('useFetchEventDetail', () => {
  let consoleSpy: jest.SpyInstance

  const i18nContextValue = {
    t: (key: string) => {
      if (key === 'error.missingToken') {
        return 'JWT token is missing'
      }
      return key
    },
    f: (date: Date) => date.toString(),
    lang: 'en'
  }

  const wrapper = ({
    children
  }: {
    children: React.ReactNode
  }): JSX.Element => (
    <I18nContext.Provider value={i18nContextValue}>
      {children}
    </I18nContext.Provider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  test('returns error state if jwt is null', () => {
    const { result } = renderHook(
      () => useFetchEventDetail(null, 'calId-123'),
      { wrapper }
    )

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(true)
    expect(result.current.errorDetail).toBe('JWT token is missing')
    expect(result.current.event).toBeUndefined()
    expect(mockFetchEvent).not.toHaveBeenCalled()
  })

  test('fetches event successfully and returns parsed data', async () => {
    const mockResponse = {
      eventJSON: ['vcalendar', []],
      attendeeEmail: 'user@example.com',
      links: { yes: 'url-yes', no: 'url-no', maybe: 'url-maybe' }
    }
    const mockParsedEvent = {
      uid: 'event-uuid-123',
      calId: 'calId-123',
      start: '2026-06-11T12:00:00Z',
      timezone: 'UTC',
      attendee: []
    }

    mockFetchEvent.mockResolvedValueOnce(mockResponse)
    mockParseFetchedEvent.mockReturnValueOnce(mockParsedEvent)

    const { result } = renderHook(
      () => useFetchEventDetail('valid-jwt', 'calId-123'),
      { wrapper }
    )

    // Initial state check
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBe(false)

    // Wait for resolution
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(false)
    expect(result.current.errorDetail).toBeUndefined()
    expect(result.current.event).toEqual({
      ...mockParsedEvent,
      URL: '/calendars/calId-123/event-uuid-123.ics'
    })
    expect(result.current.attendeeEmail).toBe('user@example.com')
    expect(result.current.links).toEqual(mockResponse.links)

    expect(mockFetchEvent).toHaveBeenCalledWith('valid-jwt')
    expect(mockParseFetchedEvent).toHaveBeenCalledWith(
      {
        URL: '',
        calId: 'calId-123',
        uid: '',
        start: '',
        timezone: 'UTC',
        attendee: []
      },
      mockResponse.eventJSON
    )
  })

  test('handles fetch event error and sets error state', async () => {
    mockFetchEvent.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(
      () => useFetchEventDetail('valid-jwt', 'calId-123'),
      { wrapper }
    )

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(true)
    expect(result.current.errorDetail).toBe('Network error')
    expect(result.current.event).toBeUndefined()
  })

  test('prevents full-screen loading spinner on subsequent fetches (token change)', async () => {
    const mockResponse1 = {
      eventJSON: ['vcalendar', []],
      attendeeEmail: 'user@example.com',
      links: { yes: 'yes1', no: 'no1', maybe: 'maybe1' }
    }
    const mockParsedEvent1 = {
      uid: 'event-1',
      calId: 'calId-123',
      start: '2026-06-11T12:00:00Z',
      timezone: 'UTC',
      attendee: []
    }

    mockFetchEvent.mockResolvedValueOnce(mockResponse1)
    mockParseFetchedEvent.mockReturnValueOnce(mockParsedEvent1)

    const { result, rerender } = renderHook(
      ({ jwt }) => useFetchEventDetail(jwt, 'calId-123'),
      {
        initialProps: { jwt: 'jwt-1' },
        wrapper
      }
    )

    // Wait for first resolution
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.event?.uid).toBe('event-1')

    // Prepare response for second token
    const mockResponse2 = {
      eventJSON: ['vcalendar', []],
      attendeeEmail: 'user@example.com',
      links: { yes: 'yes2', no: 'no2', maybe: 'maybe2' }
    }
    const mockParsedEvent2 = {
      uid: 'event-2',
      calId: 'calId-123',
      start: '2026-06-11T12:00:00Z',
      timezone: 'UTC',
      attendee: []
    }
    mockFetchEvent.mockResolvedValueOnce(mockResponse2)
    mockParseFetchedEvent.mockReturnValueOnce(mockParsedEvent2)

    // Trigger rerender with new token
    rerender({ jwt: 'jwt-2' })

    // Loading should remain false (since hasLoadedRef.current is true)
    expect(result.current.loading).toBe(false)

    // Wait for the new fetch to resolve
    await waitFor(() => {
      expect(result.current.event?.uid).toBe('event-2')
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(false)
  })

  test.each([
    {
      status: 404,
      expectedErrorDetail: 'error.eventNotFound',
      description: '404 HTTPError'
    },
    {
      status: 401,
      expectedErrorDetail: 'error.invalidOrExpiredToken',
      description: '401 HTTPError'
    },
    {
      status: 403,
      expectedErrorDetail: 'error.invalidOrExpiredToken',
      description: '403 HTTPError'
    }
  ])(
    'handles $description and sets user-friendly error state',
    async ({ status, expectedErrorDetail }) => {
      const httpError = Object.create(HTTPError.prototype)
      httpError.response = { status }
      httpError.message = `Request failed with status code ${status}`
      mockFetchEvent.mockRejectedValueOnce(httpError)

      const { result } = renderHook(
        () => useFetchEventDetail('valid-jwt', 'calId-123'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(result.current.errorDetail).toBe(expectedErrorDetail)
    }
  )

  test('sanitizes error messages containing jwt query parameter', async () => {
    const errorWithToken = new Error(
      'Failed to fetch from url?jwt=very-long-token-value&foo=bar'
    )
    mockFetchEvent.mockRejectedValueOnce(errorWithToken)

    const { result } = renderHook(
      () => useFetchEventDetail('valid-jwt', 'calId-123'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(true)
    expect(result.current.errorDetail).toBe(
      'Failed to fetch from url?jwt=...&foo=bar'
    )
  })
})
