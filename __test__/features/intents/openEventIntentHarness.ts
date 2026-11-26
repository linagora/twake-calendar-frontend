import type { Mock } from 'vitest'
import { setupStore } from '@common/app/store'
import en from '@common/locales/en.json'
import { fetchEventByUid } from '@common/features/Calendars/CalendarDAO'
import type { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import {
  fetchEventJCal,
  fetchRecurrentSeries,
  putEvent
} from '@common/features/Events/EventDao'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { api } from '@common/utils/apiUtils'
import { SdkError } from '@linagora/twake-sdk'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// The shared setup of the specs of the OPEN intent page
// (openEventIntentPage.*.test.tsx). Import it before anything else of the
// app: its mocks must be in place when the app loads.
//
// Twake Chat shows a meeting in a room and opens it in Calendar, where the
// user replies to the invitation:
//   intents.create('OPEN', 'io.cozy.calendar.events', { uid, partstat?, expected? })
// The stack frames /intents?intent=<id> of Calendar in the dialog of Chat.
// The protocol with Chat is cozy-interapp's, the real one here (see
// newEventIntentPage.test.tsx): the page answers `done` with the reply of the
// user, `cancel` (null) or `error`.
export const CHAT = 'https://chat.example.com'

const { client, sdk } = vi.hoisted(() => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  const client = { postMessage: vi.fn() }
  Object.defineProperty(window, 'parent', {
    configurable: true,
    get: () => client
  })
  const sdk = {
    platformURL: 'https://alice.workplace.test',
    status: 'waiting',
    login: vi.fn(),
    logout: vi.fn(),
    fetchJSON: vi.fn(),
    onStatusChange: vi.fn(() => () => undefined)
  }
  return { client, sdk }
})

vi.mock('@linagora/twake-sdk', async () => ({
  ...(await vi.importActual<typeof import('@linagora/twake-sdk')>(
    '@linagora/twake-sdk'
  )),
  createSdk: () => sdk
}))
// See sessionEndedElsewhere.test.tsx: the router of the routes of the app
vi.mock('redux-first-history/rr6', async () => ({
  HistoryRouter: (await import('react-router')).unstable_HistoryRouter
}))
vi.mock('@common/utils/apiUtils')
// The calendar server: the event looked up by its UID, then the reply written
vi.mock('@common/features/Calendars/CalendarDAO', async () => ({
  ...(await vi.importActual('@common/features/Calendars/CalendarDAO')),
  fetchEventByUid: vi.fn()
}))
vi.mock('@common/features/Events/EventDao', async () => ({
  ...(await vi.importActual('@common/features/Events/EventDao')),
  fetchEventJCal: vi.fn(),
  // The master and the overrides of a series, read before a reply to it all
  fetchRecurrentSeries: vi.fn(),
  putEvent: vi.fn()
}))
vi.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: vi.fn(() => ({ isTooSmall: false, isTablet: false }))
}))
vi.mock('@common/utils/navigation', () => ({ redirectTo: vi.fn() }))

export const USER_ID = '667037022b752d0026472254'
export const CAL_ID = `${USER_ID}/${USER_ID}`
export const EVENT_UID = 'weekly-sync-1'

// What the user reads, in English (no interpolation: the counts are written
// out in the tests)
export const t = (key: string): string => {
  const text = key
    .split('.')
    .reduce<unknown>(
      (dict, part) => (dict as Record<string, unknown> | undefined)?.[part],
      en
    )
  if (typeof text !== 'string') throw new Error(`en.json has no ${key}`)
  return text
}

export const MY_CALENDAR = {
  id: CAL_ID,
  name: 'My calendar',
  link: `/calendars/${CAL_ID}.json`,
  color: { light: '#FF0000', dark: '#000' },
  owner: { emails: ['test@test.com'] },
  events: {}
}

export type Reply = 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'

// The meeting Bob organizes, as the server stores it: Bob comes, the user
// (test@test.com) and Carol have not replied yet
export const storedEvent = (userReply: Reply = 'NEEDS-ACTION'): VCalComponent =>
  [
    'vcalendar',
    [],
    [
      [
        'vevent',
        [
          ['uid', {}, 'text', EVENT_UID],
          ['summary', {}, 'text', 'Weekly sync'],
          ['dtstart', {}, 'date-time', '2026-11-23T10:00:00Z'],
          ['dtend', {}, 'date-time', '2026-11-23T10:30:00Z'],
          ['organizer', { cn: 'Bob' }, 'cal-address', 'mailto:bob@example.com'],
          [
            'attendee',
            { cn: 'Bob', partstat: 'ACCEPTED', role: 'CHAIR' },
            'cal-address',
            'mailto:bob@example.com'
          ],
          [
            'attendee',
            {
              cn: 'test',
              partstat: userReply,
              rsvp: 'TRUE',
              role: 'REQ-PARTICIPANT'
            },
            'cal-address',
            'mailto:test@test.com'
          ],
          [
            'attendee',
            {
              cn: 'Carol',
              partstat: 'NEEDS-ACTION',
              rsvp: 'TRUE',
              role: 'REQ-PARTICIPANT'
            },
            'cal-address',
            'mailto:carol@example.com'
          ]
        ],
        []
      ]
    ]
  ] as unknown as VCalComponent

// The answer of the server to the lookup of the UID: `data` at `href`
export const foundAt = (
  data: VCalComponent,
  href = `/calendars/${CAL_ID}/${EVENT_UID}.ics`
): unknown => ({
  _embedded: {
    'dav:item': [{ _links: { self: { href } }, etag: '"1"', status: 200, data }]
  }
})

// The answer of the server to the lookup of the UID in the user's home
export const found = (userReply?: Reply): unknown =>
  foundAt(storedEvent(userReply))

export const notFound = (): Error =>
  Object.assign(new Error('Not Found'), { response: { status: 404 } })

// What the card of Twake Chat shows of this meeting: Calendar sends the reply
// at once only when the event it finds is that one (« Vérifier puis envoyer »,
// Clément, 2026-11-21): the UID comes from a message any member writes
export const CARD = { title: 'Weekly sync', start: '2026-11-23T10:00:00Z' }

// The notice that the reply asked was not sent (Clément, 2026-11-21)
export const NOTICE =
  'This event changed since it was shared: your answer was not sent. Choose it below.'

const intentDocument = (id: string): unknown => ({
  data: {
    type: 'io.cozy.intents',
    id,
    attributes: {
      action: 'OPEN',
      type: 'io.cozy.calendar.events',
      frameAncestors: [CHAT],
      permissions: ['GET'],
      client: CHAT
    }
  }
})

// The store of the signed-in user, with `calendars` (by default their own)
export const signedInStore = (
  calendars: Record<string, unknown> = { [CAL_ID]: MY_CALENDAR }
): ReturnType<typeof setupStore> => {
  const initial = setupStore().getState()
  return setupStore({
    ...initial,
    user: {
      ...initial.user,
      userData: {
        sub: 'test',
        email: 'test@test.com',
        openpaasId: USER_ID,
        workplaceFqdn: 'alice.workplace.test'
      },
      tokens: { access_token: 'token', id_token: 'id-token-alice' },
      organiserData: new userOrganiser({
        cn: 'test',
        cal_address: 'test@test.com'
      })
    },
    calendars: { ...initial.calendars, pending: false, list: calendars }
  } as Parameters<typeof setupStore>[0])
}

type Message = { type: string; document?: unknown; error?: unknown }
const sent = (): [Message, string][] =>
  client.postMessage.mock.calls as [Message, string][]
export const sentOfType = (kind: string): [Message, string][] =>
  sent().filter(([message]) => message.type === `intent-intent-1:${kind}`)
// How the intent ends for the client: the reply, null, or an error
export const answers = (): [Message, string][] =>
  sent().filter(([message]) =>
    /^intent-intent-1:(done|cancel|error|exposeFrameRemoval)$/.test(
      message.type
    )
  )
// The answer `done` with the reply of the user
export const done = (partstat: Reply | null): [Message, string] => [
  { type: 'intent-intent-1:done', document: { partstat } },
  CHAT
]

// Chat answers the `ready` of the page with the data of the intent
export const answerHandshake = async (data: unknown): Promise<void> => {
  await waitFor(() => expect(sentOfType('ready')).toHaveLength(1), {
    timeout: 10000
  })
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin: CHAT,
        source: client as unknown as Window
      })
    )
  })
}

// The preview of the event, as the calendar shows it once loaded
export const findPreview = async (): Promise<HTMLElement> =>
  screen.findByRole('heading', { name: 'Weekly sync' }, { timeout: 10000 })

export const replyButton = (
  reply: Exclude<Reply, 'NEEDS-ACTION'>
): HTMLElement =>
  screen.getByRole('button', { name: t(`eventPreview.${reply}`) })

export const closeButton = (): HTMLElement =>
  screen.getByRole('button', { name: t('actions.close') })

export const closePreview = async (): Promise<void> => {
  await userEvent.setup().click(closeButton())
}

export const findMessage = async (kind: string): Promise<void> => {
  await screen.findByRole(
    'heading',
    { level: 1, name: t(`intents.${kind}.title`) },
    { timeout: 10000 }
  )
}

export const settle = async (): Promise<void> =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  })

// The replies written to the server: the PARTSTAT of the user in each jCal
export const repliesWritten = (): unknown[] =>
  ((putEvent as Mock).mock.calls as [unknown, VCalComponent][]).map(
    ([, jCal]) => {
      const vevent = (jCal[2] as VCalComponent[]).find(c => c[0] === 'vevent')
      const props = (vevent?.[1] ?? []) as [
        string,
        Record<string, string>,
        string,
        string
      ][]
      const user = props.find(
        ([name, , , value]) =>
          name === 'attendee' && /test@test\.com$/i.test(value)
      )
      return user?.[1].partstat
    }
  )

export const ASKED = { uid: EVENT_UID, partstat: 'ACCEPTED' }

// The page signed in, the intent found on the stack, the event of the UID in
// the user's home
export const resetServers = (): void => {
  sdk.status = 'waiting'
  sdk.login.mockImplementation(async () => {
    sdk.status = 'ready'
  })
  sdk.fetchJSON.mockImplementation(async (path: string) => {
    const id = /^\/?intents\/([\w-]+)$/.exec(path)?.[1]
    if (!id) throw new SdkError(path, 404)
    return intentDocument(id)
  })
  ;(fetchEventByUid as Mock).mockImplementation(
    async (home: string, uid: string) => {
      if (home !== USER_ID || uid !== EVENT_UID) throw notFound()
      return found()
    }
  )
  ;(fetchEventJCal as Mock).mockImplementation(async () => storedEvent())
  ;(putEvent as Mock).mockResolvedValue(new Response(null, { status: 204 }))
}

// Today is 20 November 2026, before every occurrence of the events below: a
// reply leaves a past occurrence as it is, and the real clock would pass them
export const fakeTodayBeforeTheMeetings = (): void => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T09:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}

// A VEVENT of the meeting Bob organizes. `user`: the reply of the user,
// null when they are not an attendee of that VEVENT
export type Vevent = {
  user?: Reply | null
  recurrenceId?: string
  isSeries?: boolean
  status?: string
  title?: string
  /** Other attendees, beside Bob, the user and Carol: [address, reply] */
  others?: [string, Reply][]
}
type Prop = [string, Record<string, string>, string, unknown]
const attendee = (cn: string, address: string, partstat: Reply): Prop => [
  'attendee',
  { cn, partstat, rsvp: 'TRUE', role: 'REQ-PARTICIPANT' },
  'cal-address',
  `mailto:${address}`
]
const vevent = ({
  user = 'NEEDS-ACTION',
  recurrenceId,
  isSeries = false,
  status,
  title = 'Weekly sync',
  others = []
}: Vevent): unknown[] => {
  const start = recurrenceId ?? '2026-11-23T10:00:00Z'
  const end = start.replace('T10:00', 'T10:30')
  return [
    'vevent',
    [
      ['uid', {}, 'text', EVENT_UID],
      ...(recurrenceId
        ? [['recurrence-id', {}, 'date-time', recurrenceId]]
        : []),
      ['summary', {}, 'text', title],
      ['dtstart', {}, 'date-time', start],
      ['dtend', {}, 'date-time', end],
      ...(isSeries ? [['rrule', {}, 'recur', { freq: 'WEEKLY' }]] : []),
      ...(status ? [['status', {}, 'text', status]] : []),
      ['organizer', { cn: 'Bob' }, 'cal-address', 'mailto:bob@example.com'],
      [
        'attendee',
        { cn: 'Bob', partstat: 'ACCEPTED', role: 'CHAIR' },
        'cal-address',
        'mailto:bob@example.com'
      ],
      ...(user === null ? [] : [attendee('test', 'test@test.com', user)]),
      attendee('Carol', 'carol@example.com', 'NEEDS-ACTION'),
      ...others.map(([address, reply]) => attendee(address, address, reply))
    ],
    []
  ]
}
export const calendarObject = (...vevents: Vevent[]): VCalComponent =>
  ['vcalendar', [], vevents.map(vevent)] as unknown as VCalComponent

export const NEXT_WEEK = '2026-11-30T10:00:00Z'
export const IN_TWO_WEEKS = '2026-12-07T10:00:00Z'

// The server holds `stored` at `href`, and keeps what it is sent: the lookup
// and the reads give back the last event written. A reply is answered by
// `answer`.
export const serve = (
  stored: VCalComponent,
  {
    href = `/calendars/${CAL_ID}/${EVENT_UID}.ics`,
    answer = async (): Promise<Response> => new Response(null, { status: 204 })
  }: { href?: string; answer?: () => Promise<Response> } = {}
): void => {
  let current = stored
  const read = (): VCalComponent => structuredClone(current)
  ;(fetchEventByUid as Mock).mockImplementation(
    async (home: string, uid: string) => {
      if (home !== USER_ID || uid !== EVENT_UID) throw notFound()
      return foundAt(read(), href)
    }
  )
  ;(fetchEventJCal as Mock).mockImplementation(async () => read())
  ;(fetchRecurrentSeries as Mock).mockImplementation(async () => ({
    vevents: (read()[2] as VCalComponent[]).filter(c => c[0] === 'vevent'),
    vtimezones: []
  }))
  ;(putEvent as Mock).mockImplementation(
    async (_event: unknown, jCal: VCalComponent) => {
      const response = await answer()
      if (response.ok) current = structuredClone(jCal)
      return response
    }
  )
}

// Everything written to the calendar server, whatever the path
export const writes = (): unknown[] => [
  ...(putEvent as Mock).mock.calls,
  ...((api as unknown as Mock).mock?.calls ?? []).filter(
    ([, init]) =>
      (init as RequestInit | undefined)?.method !== undefined &&
      (init as RequestInit).method !== 'GET'
  )
]

// The reply of `address` (the user by default) in the VEVENT of a jCal
// written: the master, or the override of that RECURRENCE-ID
export const userReplyIn = (
  jCal: VCalComponent,
  recurrenceId?: string,
  address = 'test@test.com'
): string | undefined => {
  const vevent = (jCal[2] as VCalComponent[]).find(component => {
    if (component[0] !== 'vevent') return false
    const id = (component[1] as Prop[]).find(
      ([name]) => name === 'recurrence-id'
    )?.[3]
    return recurrenceId === undefined ? id === undefined : id === recurrenceId
  })
  return ((vevent?.[1] ?? []) as Prop[]).find(
    ([name, , , value]) =>
      name === 'attendee' &&
      String(value).toLowerCase() === `mailto:${address}`.toLowerCase()
  )?.[1].partstat
}
export const written = (): VCalComponent[] =>
  ((putEvent as Mock).mock.calls as [unknown, VCalComponent][]).map(
    ([, jCal]) => jCal
  )

// The client got one answer, `done` with `reply`, and no other after it
export const answeredOnceWith = async (reply: Reply | null): Promise<void> => {
  await waitFor(() => expect(answers()).toEqual([done(reply)]))
  await settle()
  expect(answers()).toHaveLength(1)
}

// A server that answers the reply when the test says so: `answer` for
// serve(), `respond` with the status of the answer
export const heldAnswer = (): {
  answer: () => Promise<Response>
  respond: (status: number) => void
} => {
  let deliver: (response: Response) => void = () => undefined
  return {
    answer: () =>
      new Promise<Response>(resolve => {
        deliver = resolve
      }),
    respond: status => deliver(new Response(null, { status }))
  }
}

// The lookups after the first one (the reloads after a reply to an
// occurrence) wait until the test lets them through, each on its own, with
// what the server held when asked; `fail` makes them fail instead
export const holdReloads = (): {
  pending: (() => void)[]
  fail: (error: Error) => void
} => {
  const lookUp = (fetchEventByUid as Mock).getMockImplementation()
  if (!lookUp) throw new Error('serve() the event before holding its reloads')
  const pending: (() => void)[] = []
  let failure: Error | null = null
  ;(fetchEventByUid as Mock)
    .mockImplementationOnce(lookUp)
    .mockImplementation(async (...args: unknown[]) => {
      const held: Promise<unknown> = lookUp(...args)
      held.catch(() => undefined)
      await new Promise<void>(resolve => pending.push(resolve))
      if (failure) throw failure
      return held
    })
  return {
    pending,
    fail: error => {
      failure = error
    }
  }
}
