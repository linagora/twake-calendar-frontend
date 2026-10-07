import { history, store } from '@common/app/store'
import {
  connectCalendarToTwakeSpace,
  syncHistoryWithTwakeSpace
} from '@common/features/Embed/twakeSpace'

const HOST = 'https://space.test'

describe('the frame of TwakeSpace', () => {
  const postMessage = jest.fn()
  const parent = { postMessage } as unknown as Window
  let stop: (() => void) | undefined

  // What the frame posted to TwakeSpace, apart from asking for its greeting
  const posted = (): unknown[][] =>
    postMessage.mock.calls.filter(
      ([data]) => (data as { type: string }).type !== 'twake-embed:ready'
    )
  const greet = (origin = HOST): void => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'twake-embed:hello' },
        origin,
        source: parent
      })
    )
  }

  beforeEach(() => {
    postMessage.mockClear()
    history.replace('/embed/calendars/team1')
  })

  afterEach(() => {
    stop?.()
  })

  it('runs on its own out of a frame', () => {
    expect(connectCalendarToTwakeSpace()).toBeNull()
  })

  it('asks whoever framed it for a greeting, and says nothing else until it comes', () => {
    const space = connectCalendarToTwakeSpace(parent)
    if (!space) throw new Error('not connected')
    stop = syncHistoryWithTwakeSpace(space, history)

    expect(postMessage).toHaveBeenCalledWith({ type: 'twake-embed:ready' }, '*')
    expect(posted()).toEqual([])

    greet('https://another-space.test')
    expect(posted()).toEqual([
      [
        {
          type: 'twake-embed:path',
          resourceId: 'team1',
          path: '',
          replace: true
        },
        'https://another-space.test'
      ]
    ])
  })

  it('reports its calendar, and shows the one TwakeSpace loads in place', () => {
    const space = connectCalendarToTwakeSpace(parent)
    if (!space) throw new Error('not connected')
    stop = syncHistoryWithTwakeSpace(space, history)
    greet()
    expect(posted()).toEqual([
      [
        {
          type: 'twake-embed:path',
          resourceId: 'team1',
          path: '',
          replace: true
        },
        HOST
      ]
    ])

    const entries = window.history.length
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'twake-embed:load', resourceId: 'team2', path: '' },
        origin: HOST,
        source: parent
      })
    )
    expect(store.getState().router.location?.pathname).toBe(
      '/embed/calendars/team2'
    )
    expect(window.history.length).toBe(entries)

    // Not a team calendar id: left alone
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'twake-embed:load', resourceId: '../x', path: '' },
        origin: HOST,
        source: parent
      })
    )
    expect(store.getState().router.location?.pathname).toBe(
      '/embed/calendars/team2'
    )
  })

  it('ignores a message that does not come from its parent', () => {
    const space = connectCalendarToTwakeSpace(parent)
    if (!space) throw new Error('not connected')
    stop = syncHistoryWithTwakeSpace(space, history)
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'twake-embed:hello' },
        origin: HOST,
        source: window
      })
    )
    expect(space.hostOrigin()).toBeNull()
    expect(posted()).toEqual([])
  })
})
