/**
 * @jest-environment jsdom
 */
import {
  CozyStackError,
  fetchCozyIntentJSON
} from '@common/features/Intents/IntentsDao'

describe('fetchCozyIntentJSON', () => {
  const mockFetch = jest.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  it('calls the Cozy stack with the bearer token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'abc' } })
    })
    const fetchJSON = fetchCozyIntentJSON({
      cozyURL: 'https://alice.twake.app/',
      accessToken: 'token'
    })

    const result = await fetchJSON('GET', '/intents/abc')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://alice.twake.app/intents/abc',
      expect.objectContaining({
        method: 'GET',
        body: undefined,
        headers: expect.objectContaining({ Authorization: 'Bearer token' })
      })
    )
    expect(result).toEqual({ data: { id: 'abc' } })
  })

  it('sends a JSON body', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })

    await fetchCozyIntentJSON({
      cozyURL: 'https://alice.twake.app',
      accessToken: 'token'
    })('POST', 'intents', { data: {} })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://alice.twake.app/intents',
      expect.objectContaining({ method: 'POST', body: '{"data":{}}' })
    )
  })

  it('keeps the HTTP status of a failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden')
    })
    const fetchJSON = fetchCozyIntentJSON({
      cozyURL: 'https://alice.twake.app',
      accessToken: 'token'
    })

    const error = await fetchJSON('GET', '/intents/abc').catch(
      (e: unknown) => e
    )

    expect(error).toBeInstanceOf(CozyStackError)
    expect((error as CozyStackError).status).toBe(403)
  })
})
