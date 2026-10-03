/**
 * @jest-environment jsdom
 */
import {
  buildIntentPath,
  getIntentIdFromSearch,
  isIntentLocation,
  rememberPendingIntent,
  takePendingIntent
} from '@common/features/Intents/pendingIntent'

describe('pendingIntent', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('reads the intent id wherever it is in the query string', () => {
    expect(getIntentIdFromSearch('?intent=abc&session_code=xyz')).toBe('abc')
    expect(getIntentIdFromSearch('?session_code=xyz&intent=abc')).toBe('abc')
    expect(getIntentIdFromSearch('')).toBe(null)
    expect(getIntentIdFromSearch('?intent=')).toBe(null)
  })

  it('recognises the intent route only with an intent id', () => {
    expect(isIntentLocation('/intents', '?intent=abc')).toBe(true)
    expect(isIntentLocation('/intents', '')).toBe(false)
    expect(isIntentLocation('/calendar', '?intent=abc')).toBe(false)
  })

  it('hands the pending intent back once', () => {
    rememberPendingIntent('abc')
    expect(takePendingIntent()).toBe('abc')
    expect(takePendingIntent()).toBe(null)
  })

  it('builds the intent path, with the SSO error when given', () => {
    expect(buildIntentPath('abc')).toBe('/intents?intent=abc')
    expect(buildIntentPath('abc', 'login_required')).toBe(
      '/intents?intent=abc&authError=login_required'
    )
  })
})
