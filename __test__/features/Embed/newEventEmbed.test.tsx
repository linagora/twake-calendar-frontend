import { history } from '@common/app/store'
import {
  connectNewEventHost,
  type NewEventHost
} from '@common/features/Embed/newEventEmbed'
import type { CalendarEvent } from '@common/types/EventsTypes'

// Twake Chat frames /embed/newEvent in a dialog: the frame talks to the page
// that framed it, and to nobody else
const CHAT = 'https://chat.test'
const ROUTE = '/embed/newEvent?attendee=alice%40example.com'

const savedEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent =>
  ({
    uid: '0b8f6c1e-2d4a-4e8b-9f7a-1c2d3e4f5a6b',
    calId: 'user1/user1',
    title: 'Weekly sync',
    start: '2026-11-09T10:00:00.000Z',
    end: '2026-11-09T10:30:00.000Z',
    allday: false,
    timezone: 'Europe/Paris',
    x_openpass_videoconference: 'https://meet.test/abc-defg-hij',
    ...overrides
  }) as CalendarEvent

describe('the new event form framed by Twake Chat', () => {
  const postMessage = vi.fn()
  const parent = { postMessage } as unknown as Window
  let host: NewEventHost | null = null

  const greet = (origin = CHAT, source: unknown = parent): void => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'twake-calendar:hello' },
        origin,
        source: source as Window
      })
    )
  }
  const connect = (): NewEventHost => {
    host = connectNewEventHost(parent)
    if (!host) throw new Error('not connected')
    return host
  }
  // What the frame posted, apart from asking for its greeting
  const posted = (): unknown[][] =>
    (postMessage.mock.calls as unknown[][]).filter(
      ([data]) => (data as { type: string }).type !== 'twake-calendar:ready'
    )

  beforeEach(() => {
    postMessage.mockClear()
    history.replace(ROUTE)
  })

  afterEach(() => {
    host?.disconnect()
    host = null
    sessionStorage.removeItem('redirectState')
  })

  it('asks whoever framed it for a greeting, once listening, without data', () => {
    connect()

    expect(postMessage.mock.calls).toEqual([
      [{ type: 'twake-calendar:ready' }, '*']
    ])
  })

  it('says nothing more until the parent greets it, then speaks to that origin alone', () => {
    connect().closed()
    expect(posted()).toEqual([])

    greet()
    expect(posted()).toEqual([[{ type: 'twake-calendar:closed' }, CHAT]])
  })

  it('ignores a greeting that does not come from its parent', () => {
    const space = connect()
    space.closed()

    greet('https://evil.test', window)
    greet('https://evil.test', {
      postMessage: vi.fn()
    })
    expect(posted()).toEqual([])

    greet()
    expect(posted()).toEqual([[{ type: 'twake-calendar:closed' }, CHAT]])
  })

  it('never posts a message to an origin that did not greet it', () => {
    const space = connect()
    greet()
    space.closed()
    space.loginRequired()

    const targets = posted().map(([, target]) => target)
    expect(targets).toEqual([CHAT, CHAT])
  })

  it('posts the messages that waited for the greeting once, in order, even when greeted twice', () => {
    // Twake Chat greets on `ready` and again on the load of its iframe
    const space = connect()
    space.loginRequired()
    space.closed()

    greet()
    greet()
    expect(posted()).toEqual([
      [{ type: 'twake-calendar:login-required' }, CHAT],
      [{ type: 'twake-calendar:closed' }, CHAT]
    ])
  })

  it('ignores the messages of its parent that are not a greeting', () => {
    const space = connect()
    space.closed()
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'twake-embed:hello' },
        origin: CHAT,
        source: parent
      })
    )
    window.dispatchEvent(
      new MessageEvent('message', {
        data: 'hello',
        origin: CHAT,
        source: parent
      })
    )
    expect(posted()).toEqual([])
  })

  it('tells its parent about the event just created', () => {
    const space = connect()
    greet()
    space.eventCreated(savedEvent())

    expect(posted()).toEqual([
      [
        {
          type: 'twake-calendar:event-created',
          event: {
            uid: '0b8f6c1e-2d4a-4e8b-9f7a-1c2d3e4f5a6b',
            title: 'Weekly sync',
            start: '2026-11-09T10:00:00.000Z',
            end: '2026-11-09T10:30:00.000Z',
            allDay: false,
            timeZone: 'Europe/Paris',
            videoConferenceUrl: 'https://meet.test/abc-defg-hij',
            // The deep link of the event in the calendar (/events/:uid)
            url: `${window.location.origin}/events/0b8f6c1e-2d4a-4e8b-9f7a-1c2d3e4f5a6b`
          }
        },
        CHAT
      ]
    ])
  })

  it('says an event without a video conference has none', () => {
    const space = connect()
    greet()
    space.eventCreated(savedEvent({ x_openpass_videoconference: undefined }))

    const [[message]] = posted() as [
      [{ event: { videoConferenceUrl: unknown } }]
    ]
    expect(message.event.videoConferenceUrl).toBeNull()
  })

  it('holds the event created for the greeting too', () => {
    const space = connect()
    space.eventCreated(savedEvent({ allday: true }))
    expect(posted()).toEqual([])

    greet()
    expect(posted()).toEqual([
      [
        expect.objectContaining({
          type: 'twake-calendar:event-created',
          event: expect.objectContaining({ allDay: true })
        }),
        CHAT
      ]
    ])
  })

  it('stops listening once disconnected', () => {
    const space = connect()
    space.closed()
    space.disconnect()
    greet()

    expect(posted()).toEqual([])
  })

  it('stays silent out of its route', () => {
    history.replace('/calendar')
    expect(connectNewEventHost(parent)).toBeNull()
    history.replace('/embed/calendars/team1')
    expect(connectNewEventHost(parent)).toBeNull()
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('connects on the callback of the silent sign in it started, query included', () => {
    history.replace('/callback?code=c&state=s')
    expect(connectNewEventHost(parent)).toBeNull()

    sessionStorage.setItem(
      'redirectState',
      JSON.stringify({
        code_verifier: 'v',
        state: 's',
        returnTo: ROUTE
      })
    )
    connect()
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'twake-calendar:ready' },
      '*'
    )
  })
})
