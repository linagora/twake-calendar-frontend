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

  beforeEach(() => {
    window.TWAKE_SPACE_ORIGIN = HOST
    history.replace('/embed/calendars/team1')
  })

  afterEach(() => {
    stop?.()
    window.TWAKE_SPACE_ORIGIN = undefined
  })

  it('runs on its own without TwakeSpace', () => {
    window.TWAKE_SPACE_ORIGIN = undefined
    expect(connectCalendarToTwakeSpace(parent)).toBeNull()
    expect(connectCalendarToTwakeSpace()).toBeNull()
  })

  it('reports its calendar, and shows the one TwakeSpace loads in place', () => {
    const space = connectCalendarToTwakeSpace(parent)
    if (!space) throw new Error('not connected')
    stop = syncHistoryWithTwakeSpace(space, history)
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: 'twake-embed:path',
        resourceId: 'team1',
        path: '',
        replace: true
      },
      HOST
    )

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
})
