/**
 * @jest-environment jsdom
 */
import {
  buildIntentPath,
  getIntentIdFromSearch,
  prepareIntentLogin,
  rememberPendingIntent,
  takePendingIntent
} from '@common/features/Intents/pendingIntent'

describe('pendingIntent', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('reads the intent id wherever it is in the query string', () => {
    expect(getIntentIdFromSearch('?intent=abc&session_code=xyz')).toBe('abc')
    expect(getIntentIdFromSearch('?session_code=xyz&intent=abc')).toBe('abc')
    expect(getIntentIdFromSearch('')).toBe(null)
    expect(getIntentIdFromSearch('?intent=')).toBe(null)
  })

  it('hands the pending intent back once', () => {
    rememberPendingIntent('abc')
    expect(takePendingIntent()).toBe('abc')
    expect(takePendingIntent()).toBe(null)
  })

  it('prepares a sign in without any SSO page in an intent frame', () => {
    window.history.pushState({}, '', '/intents?intent=abc')

    expect(prepareIntentLogin()).toEqual({ prompt: 'none' })
    expect(sessionStorage.getItem('pendingIntentId')).toBe('abc')
  })

  it('recognises the intent route whatever its case or trailing slash', () => {
    window.history.pushState({}, '', '/intents/?intent=abc')
    expect(prepareIntentLogin()).toEqual({ prompt: 'none' })

    window.history.pushState({}, '', '/Intents?intent=abc')
    expect(prepareIntentLogin()).toEqual({ prompt: 'none' })
  })

  it('forgets a stale pending intent on a regular sign in', () => {
    rememberPendingIntent('stale')
    window.history.pushState({}, '', '/calendar')

    expect(prepareIntentLogin()).toEqual({})
    expect(sessionStorage.getItem('pendingIntentId')).toBe(null)
  })

  it('prepares the regular sign in everywhere else', () => {
    window.history.pushState({}, '', '/calendar?intent=abc')
    expect(prepareIntentLogin()).toEqual({})

    window.history.pushState({}, '', '/intents')
    expect(prepareIntentLogin()).toEqual({})

    window.history.pushState({}, '', '/intents/sub?intent=abc')
    expect(prepareIntentLogin()).toEqual({})

    expect(sessionStorage.getItem('pendingIntentId')).toBe(null)
  })

  it('builds the intent path, with the SSO error when given', () => {
    expect(buildIntentPath('abc')).toBe('/intents?intent=abc')
    expect(buildIntentPath('abc', 'login_required')).toBe(
      '/intents?intent=abc&authError=login_required'
    )
  })
})
