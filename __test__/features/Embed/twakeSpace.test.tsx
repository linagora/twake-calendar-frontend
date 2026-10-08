import { history, store } from '@common/app/store'
import {
  connectCalendarToTwakeSpace,
  countUpcomingEvents,
  openMeetingInTwakeSpace,
  reportUpcomingEventsToTwakeSpace,
  syncHistoryWithTwakeSpace
} from '@common/features/Embed/twakeSpace'
import type { Calendar } from '@common/types/CalendarTypes'
import type { CalendarEvent } from '@common/types/EventsTypes'

const HOST = 'https://space.test'

describe('the frame of TwakeSpace', () => {
  const postMessage = jest.fn()
  const parent = { postMessage } as unknown as Window
  let stop: (() => void) | undefined

  // What the frame posted to TwakeSpace, apart from asking for its greeting
  const posted = (): unknown[][] =>
    (postMessage.mock.calls as unknown[][]).filter(
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

  it('changes nothing in a frame that is not TwakeSpace', () => {
    // The Cozy workplace frames the application on its usual routes
    history.replace('/calendar')
    expect(connectCalendarToTwakeSpace(parent)).toBeNull()
    // The history is left as it is: no own `pushState` shadows the browser's
    expect(Object.hasOwn(window.history, 'pushState')).toBe(false)
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('connects on the callback of the silent sign in of an embed route', () => {
    history.replace('/callback?code=c&state=s')
    expect(connectCalendarToTwakeSpace(parent)).toBeNull()

    sessionStorage.setItem(
      'redirectState',
      JSON.stringify({
        code_verifier: 'v',
        state: 's',
        returnTo: '/embed/calendars/team1'
      })
    )
    const space = connectCalendarToTwakeSpace(parent)
    sessionStorage.removeItem('redirectState')
    expect(space).not.toBeNull()
    space?.disconnect()
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

  it('opens a video meeting in the call window of TwakeSpace, once greeted', () => {
    const space = connectCalendarToTwakeSpace(parent)
    if (!space) throw new Error('not connected')
    greet()
    expect(
      openMeetingInTwakeSpace('https://meet.test/abc-defg-hij', space)
    ).toBe(true)
    expect(posted()).toContainEqual([
      { type: 'twake-embed:pip', url: 'https://meet.test/abc-defg-hij' },
      HOST
    ])
    space.disconnect()
  })

  it('leaves a video meeting to the link on its own', () => {
    expect(
      openMeetingInTwakeSpace('https://meet.test/abc-defg-hij', null)
    ).toBe(false)
  })

  describe('the upcoming events of the team calendars', () => {
    const NOW = Date.parse('2026-10-08T10:00:00Z')
    const DAY = 24 * 60 * 60 * 1000
    const event = (start: number): CalendarEvent =>
      ({ start: new Date(start).toISOString() }) as CalendarEvent
    const calendar = (
      id: string,
      teamCalendar: boolean,
      events: CalendarEvent[]
    ): Calendar =>
      ({
        id,
        owner: { teamCalendar },
        events: Object.fromEntries(events.map((e, i) => [`e${i}`, e]))
      }) as unknown as Calendar
    const calendars = {
      'team1/team1': calendar('team1/team1', true, [
        event(NOW - 1),
        event(NOW),
        event(NOW + 3 * DAY),
        event(NOW + 7 * DAY),
        event(NOW + 7 * DAY + 1)
      ]),
      'team2/team2': calendar('team2/team2', true, []),
      'user1/user1': calendar('user1/user1', false, [event(NOW + DAY)])
    }

    it('counts the events from now through the next 7 days, by embed route id', () => {
      expect(countUpcomingEvents(calendars, NOW)).toEqual([
        { resourceId: 'team1', name: 'events.upcoming', value: 3 },
        { resourceId: 'team2', name: 'events.upcoming', value: 0 }
      ])
    })

    it('reports them to TwakeSpace, and again when they change', () => {
      const space = connectCalendarToTwakeSpace(parent)
      if (!space) throw new Error('not connected')
      let list: Record<string, Calendar> = {}
      const listeners: (() => void)[] = []
      const fakeStore = {
        getState: (): { calendars: { list: Record<string, Calendar> } } => ({
          calendars: { list }
        }),
        subscribe: (listener: () => void): (() => void) => {
          listeners.push(listener)
          return (): void => {
            listeners.splice(listeners.indexOf(listener), 1)
          }
        }
      }
      const metadata = (): unknown[] =>
        posted()
          .map(([data]) => data as { type: string; metadata: unknown })
          .filter(data => data.type === 'twake-embed:metadata')
          .map(data => data.metadata)

      stop = reportUpcomingEventsToTwakeSpace(space, fakeStore)
      greet()
      expect(metadata()).toEqual([[]])

      list = { 'team2/team2': calendars['team2/team2'] }
      listeners.forEach(listener => listener())
      listeners.forEach(listener => listener())
      expect(metadata()).toEqual([
        [],
        [{ resourceId: 'team2', name: 'events.upcoming', value: 0 }]
      ])

      stop()
      stop = undefined
      expect(listeners).toEqual([])
      space.disconnect()
    })
  })
})
