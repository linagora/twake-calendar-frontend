import type { MockInstance } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
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
  let consoleSpy: MockInstance

  beforeEach((): void => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation((): void => {})
  })

  afterEach((): void => {
    consoleSpy.mockRestore()
  })

  const wrapper = ({
    children
  }: {
    children: React.ReactNode
  }): React.JSX.Element => (
    <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
  )

  const renderWithPayload = (
    payload: object,
    query = ''
  ): {
    token: string
    result: { current: ReturnType<typeof useParseToken> }
  } => {
    const token = makeMockJwt(payload)
    const wrapperWithValidJwt = ({
      children
    }: {
      children: React.ReactNode
    }): React.JSX.Element => (
      <MemoryRouter initialEntries={[`/?jwt=${token}${query}`]}>
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
    expectedAction: string | undefined,
    expectedParticipationAction: string | undefined
  ): void => {
    expect(resultCurrent).toEqual({
      jwt: expectedJwt,
      calId: basePayload.calendarURI,
      eventId: basePayload.uid,
      action: expectedAction,
      participationAction: expectedParticipationAction,
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
    }): React.JSX.Element => (
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
    assertParsedToken(result.current, token, 'ACCEPTED', 'ACCEPTED')
  })

  test('normalizes action REJECTED to DECLINED', (): void => {
    const { token, result } = renderWithPayload({
      ...basePayload,
      action: 'REJECTED'
    })
    assertParsedToken(result.current, token, 'DECLINED', 'REJECTED')
  })

  test('reads the action of the link when the token holds none', (): void => {
    const { token, result } = renderWithPayload(
      basePayload,
      '&action=TENTATIVE'
    )
    assertParsedToken(result.current, token, 'TENTATIVE', 'TENTATIVE')
  })

  test('normalizes the REJECTED action of the link to DECLINED', (): void => {
    const { token, result } = renderWithPayload(basePayload, '&action=REJECTED')
    assertParsedToken(result.current, token, 'DECLINED', 'REJECTED')
  })

  test('prefers the action of the link over the one of the token', (): void => {
    const { token, result } = renderWithPayload(
      { ...basePayload, action: 'ACCEPTED' },
      '&action=REJECTED'
    )
    assertParsedToken(result.current, token, 'DECLINED', 'REJECTED')
  })

  test('falls back to the action of the token when the link one is unknown', (): void => {
    const { token, result } = renderWithPayload(
      { ...basePayload, action: 'ACCEPTED' },
      '&action=DECLINED'
    )
    assertParsedToken(result.current, token, 'ACCEPTED', 'ACCEPTED')
  })

  test('has no action when neither the link nor the token holds one', (): void => {
    const { token, result } = renderWithPayload(basePayload)
    assertParsedToken(result.current, token, undefined, undefined)
  })
})
