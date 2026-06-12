import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { useParseToken } from '@public/features/EventPreview/hooks/useParseToken'

// Helper to build a mock JWT token with a base64url encoded payload
function makeMockJwt(payload: object): string {
  const payloadStr = JSON.stringify(payload)
  const base64 = window.btoa(payloadStr)
  const base64Url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${base64Url}.signature`
}

describe('useParseToken', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach((): void => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation((): void => {})
  })

  afterEach((): void => {
    consoleSpy.mockRestore()
  })

  const wrapper = ({
    children
  }: {
    children: React.ReactNode
  }): JSX.Element => (
    <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
  )

  const renderWithPayload = (
    payload: object
  ): {
    token: string
    result: { current: ReturnType<typeof useParseToken> }
  } => {
    const token = makeMockJwt(payload)
    const wrapperWithValidJwt = ({
      children
    }: {
      children: React.ReactNode
    }): JSX.Element => (
      <MemoryRouter initialEntries={[`/?jwt=${token}`]}>
        {children}
      </MemoryRouter>
    )
    const renderResult = renderHook(() => useParseToken(), {
      wrapper: wrapperWithValidJwt
    })
    return {
      token,
      result: renderResult.result
    }
  }

  const basePayload = {
    calendarURI: 'cal-123',
    uid: 'event-456',
    organizerEmail: 'org@example.com',
    attendeeEmail: 'att@example.com'
  }

  const assertParsedToken = (
    resultCurrent: ReturnType<typeof useParseToken>,
    expectedJwt: string,
    expectedAction: string
  ): void => {
    expect(resultCurrent).toEqual({
      jwt: expectedJwt,
      calId: basePayload.calendarURI,
      eventId: basePayload.uid,
      action: expectedAction,
      organizerEmail: basePayload.organizerEmail,
      attendeeEmail: basePayload.attendeeEmail
    })
  }

  test('returns null when jwt query parameter is not present', (): void => {
    const { result } = renderHook(() => useParseToken(), { wrapper })
    expect(result.current).toBeNull()
  })

  test('returns null when jwt query parameter is present but invalid/malformed', (): void => {
    const wrapperWithInvalidJwt = ({
      children
    }: {
      children: React.ReactNode
    }): JSX.Element => (
      <MemoryRouter initialEntries={['/?jwt=invalid-jwt-token']}>
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => useParseToken(), {
      wrapper: wrapperWithInvalidJwt
    })
    expect(result.current).toBeNull()
  })

  test('returns parsed token when jwt query parameter is valid', (): void => {
    const { token, result } = renderWithPayload({
      ...basePayload,
      action: 'ACCEPTED'
    })
    assertParsedToken(result.current, token, 'ACCEPTED')
  })

  test('normalizes action REJECTED to DECLINED', (): void => {
    const { token, result } = renderWithPayload({
      ...basePayload,
      action: 'REJECTED'
    })
    assertParsedToken(result.current, token, 'DECLINED')
  })
})
