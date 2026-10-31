import { toPathRoute } from '@common/utils/hashRoute'

describe('toPathRoute', () => {
  it('returns null when there is no hash', () => {
    expect(
      toPathRoute({ pathname: '/events/abc', search: '', hash: '' })
    ).toBeNull()
  })

  it('returns null when the hash is not a route', () => {
    expect(
      toPathRoute({ pathname: '/', search: '', hash: '#section' })
    ).toBeNull()
  })

  it('rewrites a hash route into a path', () => {
    expect(
      toPathRoute({ pathname: '/', search: '', hash: '#/events/abc' })
    ).toBe('/events/abc')
  })

  it('rewrites the hash root into the root path', () => {
    expect(toPathRoute({ pathname: '/', search: '', hash: '#/' })).toBe('/')
  })

  it('preserves the query parameters within the hash', () => {
    expect(
      toPathRoute({
        pathname: '/',
        search: '',
        hash: '#/events/abc?start=2026-01-01&view=week'
      })
    ).toBe('/events/abc?start=2026-01-01&view=week')
  })

  it('preserves the query parameters before the hash', () => {
    expect(
      toPathRoute({
        pathname: '/',
        search: '?jwt=token',
        hash: '#/events/abc'
      })
    ).toBe('/events/abc?jwt=token')
  })

  it('merges the query parameters before and within the hash', () => {
    expect(
      toPathRoute({
        pathname: '/',
        search: '?jwt=token',
        hash: '#/events/abc?view=week'
      })
    ).toBe('/events/abc?jwt=token&view=week')
  })

  it('preserves encoded path segments and parameters', () => {
    expect(
      toPathRoute({
        pathname: '/',
        search: '',
        hash: '#/events/a%20b?title=x%26y'
      })
    ).toBe('/events/a%20b?title=x%26y')
  })

  it('preserves a nested fragment', () => {
    expect(
      toPathRoute({
        pathname: '/',
        search: '',
        hash: '#/events/abc?view=week#details'
      })
    ).toBe('/events/abc?view=week#details')
  })
})

describe('toPathRoute with an authority-like hash path', () => {
  it.each(['#///#details', '#/\\#details', '#//'])(
    'does not throw on %s and returns a same-origin path',
    hash => {
      let result: string | null = null
      expect(() => {
        result = toPathRoute({ pathname: '/events/abc', search: '', hash })
      }).not.toThrow()
      expect(result).toMatch(/^\/(?![/\\])/)
    }
  )

  it('keeps the nested fragment after an empty authority', () => {
    expect(
      toPathRoute({ pathname: '/events/abc', search: '', hash: '#///#details' })
    ).toBe('/#details')
  })

  it('does not read a double slash segment as a host', () => {
    expect(
      toPathRoute({ pathname: '/', search: '', hash: '#//other.example/x' })
    ).toBe('/other.example/x')
  })
})
