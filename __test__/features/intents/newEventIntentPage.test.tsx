import type { Mock } from 'vitest'
import { setupStore } from '@common/app/store'
import en from '@common/locales/en.json'
import { putEvent } from '@common/features/Events/EventDao'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { getCalendarsList } from '@common/features/Calendars/CalendarSlice'
import { fetchCalendars } from '@common/features/Calendars/CalendarDAO'
import { redirectTo } from '@common/utils/navigation'
import { SdkAuthError, SdkError } from '@linagora/twake-sdk'
import { IntentsApp } from '@private/IntentsApp'
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'

// Twake Chat asks for a new event with the members of a room:
//   intents.create('CREATE', 'io.cozy.calendar.events', { attendees })
// The stack frames /intents?intent=<id> of Calendar in the dialog of Chat.
// The protocol with Chat is cozy-interapp's, the real one here: the page
// reads the intent from the stack, says `ready` to the origin of the client,
// takes its data, and answers `done` (the event), `cancel` (null) or `error`.
// What the client receives is what Chat's window gets by postMessage.
const CHAT = 'https://chat.example.com'

const { client, frame, sdk } = vi.hoisted(() => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  // The window of Twake Chat, around the frame
  const client = { postMessage: vi.fn() }
  const frame: { parent: unknown } = { parent: client }
  Object.defineProperty(window, 'parent', {
    configurable: true,
    get: () => frame.parent
  })
  // The client of the user's platform (cozy-stack), as Calendar signs it in
  // with the id token of the user (sdkSession)
  const sdk = {
    platformURL: 'https://alice.workplace.test',
    status: 'waiting',
    login: vi.fn(),
    logout: vi.fn(),
    fetchJSON: vi.fn(),
    onStatusChange: vi.fn(() => () => undefined)
  }
  return { client, frame, sdk }
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
vi.mock('@common/features/Events/EventDao', async () => ({
  ...(await vi.importActual('@common/features/Events/EventDao')),
  putEvent: vi.fn()
}))
vi.mock('@common/features/Calendars/CalendarDAO', async () => ({
  ...(await vi.importActual('@common/features/Calendars/CalendarDAO')),
  fetchCalendars: vi.fn()
}))
vi.mock('@common/useScreenSizeDetection', () => ({
  useScreenSizeDetection: vi.fn(() => ({ isTooSmall: false, isTablet: false }))
}))
// jsdom cannot leave the page: where the app would go instead
vi.mock('@common/utils/navigation', () => ({ redirectTo: vi.fn() }))

const USER_ID = '667037022b752d0026472254'

// What the user reads, in English. A key missing from en.json fails here,
// with its name
const t = (key: string): string => {
  const text = key
    .split('.')
    .reduce<unknown>(
      (dict, part) => (dict as Record<string, unknown> | undefined)?.[part],
      en
    )
  if (typeof text !== 'string') throw new Error(`en.json has no ${key}`)
  return text
}

const MY_CALENDARS = {
  pending: false,
  list: {
    [`${USER_ID}/${USER_ID}`]: {
      id: `${USER_ID}/${USER_ID}`,
      name: 'My calendar',
      color: { light: '#FF0000', dark: '#000' },
      owner: { emails: ['test@test.com'] },
      events: {}
    }
  }
}

// The intent as the stack keeps it: created by Twake Chat (`client`)
let stackIntent: {
  action: string
  type: string
  frameAncestors?: unknown
} = { action: 'CREATE', type: 'io.cozy.calendar.events' }

const intentDocument = (id: string): unknown => ({
  data: {
    type: 'io.cozy.intents',
    id,
    attributes: {
      action: stackIntent.action,
      type: stackIntent.type,
      permissions: ['GET'],
      client: CHAT,
      ...(stackIntent.frameAncestors === undefined
        ? {}
        : { frameAncestors: stackIntent.frameAncestors })
    }
  }
})

// Signed in at the SSO (the silent sign-in of the frame is done)
const signedInStore = (
  calendars: { pending: boolean; list: object } = MY_CALENDARS,
  workplaceFqdn: string | undefined = 'alice.workplace.test'
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
        workplaceFqdn
      },
      tokens: { access_token: 'token', id_token: 'id-token-alice' },
      organiserData: new userOrganiser({
        cn: 'test',
        cal_address: 'test@test.com'
      })
    },
    calendars: { ...initial.calendars, ...calendars }
  } as Parameters<typeof setupStore>[0])
}

const openIntent = (
  id = 'intent-1',
  store: ReturnType<typeof setupStore> = signedInStore()
): ReturnType<typeof setupStore> => {
  window.history.replaceState(null, '', `/intents?intent=${id}`)
  render(
    <Provider store={store}>
      <IntentsApp />
    </Provider>
  )
  return store
}

type Message = { type: string; document?: unknown; error?: unknown }
const sent = (): [Message, string][] =>
  client.postMessage.mock.calls as [Message, string][]
const sentOfType = (kind: string, id = 'intent-1'): [Message, string][] =>
  sent().filter(([message]) => message.type === `intent-${id}:${kind}`)
// How the intent ends for the client: the event, null, or an error
const answers = (): [Message, string][] =>
  sent().filter(([message]) =>
    /:(done|cancel|error|exposeFrameRemoval)$/.test(message.type)
  )

const fromClient = (data: unknown, origin = CHAT): void => {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin,
        source: client as unknown as Window
      })
    )
  })
}

const ROOM = { attendees: ['alice@example.com', 'bob@example.com'] }

// Chat answers the `ready` of the page with the data of the intent
const answerHandshake = async (
  data: unknown = ROOM,
  id = 'intent-1'
): Promise<void> => {
  await waitFor(() => expect(sentOfType('ready', id)).toHaveLength(1), {
    timeout: 10000
  })
  fromClient(data)
}

const findForm = async (): Promise<HTMLElement> =>
  screen.findByRole('textbox', { name: /title/i }, { timeout: 10000 })

// Why the page cannot serve the intent: the whole page, in the frame
const findMessage = async (kind: string): Promise<void> => {
  const heading = await screen.findByRole(
    'heading',
    { level: 1, name: t(`intents.${kind}.title`) },
    { timeout: 10000 }
  )
  expect(screen.getByRole('main')).toContainElement(heading)
  expect(
    screen.queryByRole('textbox', { name: /title/i })
  ).not.toBeInTheDocument()
}

// A failed save keeps what the user typed for the next form: once it is
// kept, the app has handled the failure
const failureHandled = async (): Promise<void> =>
  waitFor(() =>
    expect(
      JSON.parse(sessionStorage.getItem('eventFormTempData_create') ?? '{}')
        .fromError
    ).toBe(true)
  )

// Lets every pending promise and the renders they cause run
const settle = async (): Promise<void> =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  })

const setAncestorOrigins = (origins: string[]): void => {
  Object.defineProperty(window.location, 'ancestorOrigins', {
    value: origins,
    configurable: true
  })
}

describe('the new event Twake Chat asks for with a cozy-stack intent', () => {
  let entries: number

  beforeEach(() => {
    entries = window.history.length
    frame.parent = client
    stackIntent = { action: 'CREATE', type: 'io.cozy.calendar.events' }
    sdk.status = 'waiting'
    sdk.login.mockImplementation(async () => {
      sdk.status = 'ready'
    })
    sdk.fetchJSON.mockImplementation(async (path: string) => {
      const id = /^\/?intents\/([\w-]+)$/.exec(path)?.[1]
      if (!id) throw new SdkError(path, 404)
      return intentDocument(id)
    })
    ;(putEvent as Mock).mockResolvedValue(new Response(null, { status: 201 }))
  })

  afterEach(() => {
    Reflect.deleteProperty(window.location, 'ancestorOrigins')
    sessionStorage.removeItem('eventFormTempData_create')
  })

  describe('the form', () => {
    it('opens the create form with the attendees the client sends', async () => {
      openIntent()
      await answerHandshake()

      await findForm()
      expect(screen.getByText(t('event.createEvent'))).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('opens the create form without attendees when the client names none', async () => {
      openIntent()
      await answerHandshake({})

      await findForm()
      expect(screen.getByText(t('event.createEvent'))).toBeInTheDocument()
      expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
    })

    it('shows the form alone: no expand arrow, no backdrop, no Twake bar, no calendar', async () => {
      openIntent()
      await answerHandshake()

      await findForm()
      expect(
        screen.queryByRole('button', { name: t('tooltip.expand') })
      ).not.toBeInTheDocument()
      expect(document.querySelector('.MuiBackdrop-root')).toBeNull()
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      expect(window.location.pathname).toBe('/intents')
      expect(redirectTo).not.toHaveBeenCalled()
    })

    it('reads the intent from the stack of the user with the token of the platform sign-in', async () => {
      openIntent()
      await answerHandshake()
      await findForm()

      // The id token of the user, exchanged by the platform client
      expect(sdk.login).toHaveBeenCalledWith('id-token-alice')
      expect(sdk.fetchJSON).toHaveBeenCalledWith(
        '/intents/intent-1',
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('the handshake', () => {
    it('shows nothing but a loader while the client has not answered, and takes no answer from another origin', async () => {
      openIntent()
      await waitFor(() => expect(sentOfType('ready')).toHaveLength(1), {
        timeout: 10000
      })
      // The `ready` goes to the origin of the app that created the intent
      expect(sentOfType('ready')).toEqual([
        [{ type: 'intent-intent-1:ready' }, CHAT]
      ])

      await settle()
      expect(screen.getByTestId('loading')).toBeInTheDocument()
      expect(
        screen.queryByRole('textbox', { name: /title/i })
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()

      // A page that framed /intents itself is no client
      fromClient(ROOM, 'https://evil.example')
      await settle()
      expect(
        screen.queryByRole('textbox', { name: /title/i })
      ).not.toBeInTheDocument()

      fromClient(ROOM)
      await findForm()
    })

    it('says the client did not answer, once 30 s are over', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      onTestFinished(() => {
        vi.useRealTimers()
      })
      openIntent()
      await waitFor(() => expect(sentOfType('ready')).toHaveLength(1), {
        timeout: 10000
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000)
      })

      await findMessage('failed')
    })

    it('speaks only cozy-interapp, and only to the origin of the client', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake()

      await findForm()
      await user.click(screen.getByRole('button', { name: t('actions.close') }))
      await waitFor(() => expect(answers()).toHaveLength(1))

      expect(sent().length).toBeGreaterThan(0)
      for (const [message, target] of sent()) {
        expect(message.type).toMatch(/^intent-intent-1:/)
        expect(target).toBe(CHAT)
      }
    })
  })

  describe('the result', () => {
    it('gives the client the event it saved, on the day the user picked', async () => {
      // Today is 9 November 2026: the form opens on that day
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-11-09T10:12:00Z'))
      onTestFinished(() => {
        vi.useRealTimers()
      })
      const user = userEvent.setup()
      openIntent()
      await answerHandshake()

      await user.type(await findForm(), 'Weekly sync')
      await user.click(
        screen.getByRole('button', { name: t('common.moreOptions') })
      )
      await user.click(
        screen.getByRole('checkbox', { name: t('event.form.allDay') })
      )
      await user.click(screen.getByRole('button', { name: t('actions.save') }))

      await waitFor(() => expect(sentOfType('done')).toHaveLength(1))
      const [[message, target]] = sentOfType('done')
      expect(target).toBe(CHAT)
      const event = message.document as Record<string, unknown>
      // An all day event: from midnight UTC of its day to midnight of the next
      expect(event).toMatchObject({
        title: 'Weekly sync',
        start: '2026-11-09T00:00:00.000Z',
        end: '2026-11-10T00:00:00.000Z',
        allDay: true,
        videoConferenceUrl: null
      })
      expect(Object.keys(event).sort()).toEqual(
        [
          'allDay',
          'end',
          'start',
          'timeZone',
          'title',
          'uid',
          'url',
          'videoConferenceUrl'
        ].sort()
      )
      const uid = event.uid as string
      expect(uid).toMatch(/\S/)
      expect(event.url).toBe(`${window.location.origin}/events/${uid}`)
      expect(typeof event.timeZone).toBe('string')
      expect(answers()).toHaveLength(1)
      expect(window.history.length).toBe(entries)
    })

    it('gives the client null when the user closes the form with ✕', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake()

      await findForm()
      await user.click(screen.getByRole('button', { name: t('actions.close') }))

      await waitFor(() =>
        expect(answers()).toEqual([[{ type: 'intent-intent-1:cancel' }, CHAT]])
      )
      expect(putEvent).not.toHaveBeenCalled()
      expect(window.history.length).toBe(entries)
    })

    it('gives the client null when the user cancels the full form', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake()

      await findForm()
      await user.click(
        screen.getByRole('button', { name: t('common.moreOptions') })
      )
      await user.click(screen.getByRole('button', { name: t('common.cancel') }))

      await waitFor(() =>
        expect(answers()).toEqual([[{ type: 'intent-intent-1:cancel' }, CHAT]])
      )
      expect(putEvent).not.toHaveBeenCalled()
    })

    it('asks before dropping a typed event, and tells the client nothing while the user keeps it', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake()

      await user.type(await findForm(), 'Weekly sync')
      await user.click(screen.getByRole('button', { name: t('actions.close') }))

      await screen.findByRole('dialog', {
        name: t('editModeDialog.discardChanges.title')
      })
      await settle()
      expect(answers()).toEqual([])
    })
  })

  describe('saving', () => {
    it('says the save failed, keeps what the user typed, and tells the client nothing', async () => {
      ;(putEvent as Mock).mockRejectedValue(new Error('Server down'))
      const user = userEvent.setup()
      openIntent()
      await answerHandshake()

      await user.type(await findForm(), 'Weekly sync')
      await user.click(screen.getByRole('button', { name: t('actions.save') }))

      // The message the calendar shows for a failed save (error.saveEventFailed)
      const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
      expect(alert).toHaveTextContent(t('error.saveEventFailed'))
      expect(
        within(alert).getByRole('button', { name: t('common.ok') })
      ).toBeInTheDocument()
      await failureHandled()
      await settle()
      expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue(
        'Weekly sync'
      )
      expect(answers()).toEqual([])
    })

    it('saves the event once when the user submits again while it is saving', async () => {
      let answer: (response: Response) => void = () => {}
      ;(putEvent as Mock).mockReturnValueOnce(
        new Promise<Response>(resolve => {
          answer = resolve
        })
      )
      const user = userEvent.setup()
      openIntent()
      await answerHandshake()

      await user.type(await findForm(), 'Weekly sync')
      const save = screen.getByRole('button', { name: t('actions.save') })
      await user.click(save)
      await waitFor(() => expect(putEvent).toHaveBeenCalledTimes(1))
      // Locked while the server has not answered
      expect(screen.getByRole('button', { name: t('actions.save') })).toBeDisabled()
      // An impatient second try, with Enter in the title
      await user.click(screen.getByRole('textbox', { name: /title/i }))
      await user.keyboard('{Enter}')
      await settle()
      expect(putEvent).toHaveBeenCalledTimes(1)

      answer(new Response(null, { status: 201 }))
      await settle()
      expect(putEvent).toHaveBeenCalledTimes(1)
      expect(sentOfType('done')).toHaveLength(1)
    })

    it('saves the event once when the user submits again after it is saved, before Chat closes its dialog', async () => {
      // A disabled Save is clicked like any other: it must simply do nothing
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      openIntent()
      await answerHandshake()

      await user.type(await findForm(), 'Weekly sync')
      await user.click(screen.getByRole('button', { name: t('actions.save') }))
      await waitFor(() => expect(sentOfType('done')).toHaveLength(1))

      const titleBox = screen.queryByRole('textbox', { name: /title/i })
      if (titleBox) {
        await user.click(titleBox)
        await user.keyboard('{Enter}')
      }
      const saveButton = screen.queryByRole('button', {
        name: t('actions.save')
      })
      if (saveButton) {
        expect(saveButton).toBeDisabled()
        await user.click(saveButton)
      }
      await settle()

      expect(putEvent).toHaveBeenCalledTimes(1)
      expect(answers()).toHaveLength(1)
    })

    it('lets the user save again after a failed save, and gives the client the event once it works', async () => {
      ;(putEvent as Mock).mockRejectedValueOnce(new Error('Server down'))
      const user = userEvent.setup()
      openIntent()
      await answerHandshake()

      await user.type(await findForm(), 'Weekly sync')
      await user.click(screen.getByRole('button', { name: t('actions.save') }))
      await failureHandled()
      await settle()
      expect(answers()).toEqual([])
      expect(
        screen.getByRole('button', { name: t('actions.save') })
      ).toBeEnabled()

      await user.click(screen.getByRole('button', { name: t('actions.save') }))

      await waitFor(() => expect(sentOfType('done')).toHaveLength(1))
      expect(putEvent).toHaveBeenCalledTimes(2)
    })

    it('opens a fresh event for each intent, never the draft a failed save left in an earlier one', async () => {
      // A save fails in the dialog of one room, which the user then leaves
      ;(putEvent as Mock).mockRejectedValue(new Error('Server down'))
      const user = userEvent.setup()
      openIntent('intent-1')
      await answerHandshake(ROOM, 'intent-1')
      await user.type(await findForm(), 'Draft of another room')
      await user.click(screen.getByRole('button', { name: t('actions.save') }))
      await failureHandled()
      cleanup()

      // Chat asks again, for another room
      openIntent('intent-2')
      await answerHandshake({ attendees: ['carol@example.com'] }, 'intent-2')

      expect(await findForm()).toHaveValue('')
      expect(screen.getByText('carol@example.com')).toBeInTheDocument()
      expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
      expect(screen.queryByText('bob@example.com')).not.toBeInTheDocument()
    })
  })

  describe('without a calendar', () => {
    // The calendar's own text for a calendar list it could not get
    // (error.calendarsNotFound); the client gets null once the user closed it
    const noCalendarShownThenClosed = async (): Promise<void> => {
      const user = userEvent.setup()
      expect(
        await screen.findByText(t('error.calendarsNotFound'), undefined, {
          timeout: 3000
        })
      ).toBeVisible()
      expect(
        screen.queryByRole('textbox', { name: /title/i })
      ).not.toBeInTheDocument()
      await settle()
      expect(answers()).toEqual([])

      await user.click(screen.getByRole('button', { name: t('actions.close') }))

      await waitFor(() =>
        expect(answers()).toEqual([[{ type: 'intent-intent-1:cancel' }, CHAT]])
      )
    }

    it('says there is no calendar to save into, and gives the client null once the user closes it', async () => {
      openIntent('intent-1', signedInStore({ pending: false, list: {} }))
      await answerHandshake()

      await noCalendarShownThenClosed()
    })

    it('says the calendars could not be loaded once they fail, and gives the client null once the user closes it', async () => {
      ;(fetchCalendars as Mock).mockRejectedValue(new Error('Server down'))
      const store = openIntent(
        'intent-1',
        signedInStore({ pending: true, list: {} })
      )
      await answerHandshake()

      // Still loading: no message yet, nothing told
      await settle()
      expect(
        screen.queryByText(t('error.calendarsNotFound'))
      ).not.toBeInTheDocument()
      expect(answers()).toEqual([])

      await act(async () => {
        await store.dispatch(getCalendarsList())
      })

      await noCalendarShownThenClosed()
    })
  })

  describe('an intent the page cannot serve', () => {
    it('fails an intent Calendar does not serve', async () => {
      stackIntent = { action: 'PICK', type: 'io.cozy.files' }
      openIntent()
      await answerHandshake()

      await findMessage('unsupported')
      await waitFor(() => expect(sentOfType('error')).toHaveLength(1))
      expect(answers()).toHaveLength(1)
    })

    it('fails a new event asked with data of another shape', async () => {
      openIntent()
      await answerHandshake({ attendees: 'bob@example.com' })

      await findMessage('invalidData')
      await waitFor(() => expect(sentOfType('error')).toHaveLength(1))
      expect(answers()).toHaveLength(1)
    })

    it('says it cannot open outside a frame, and asks the stack nothing', async () => {
      frame.parent = window
      openIntent()

      await findMessage('unavailable')
      expect(sdk.fetchJSON).not.toHaveBeenCalled()
    })

    it('says it cannot open when the stack refuses the token', async () => {
      sdk.login.mockRejectedValue(
        new SdkAuthError('/auth/token_exchange', 400)
      )
      openIntent()

      await findMessage('unavailable')
      expect(sdk.fetchJSON).not.toHaveBeenCalled()
      expect(sentOfType('ready')).toEqual([])
    })

    it('says it cannot open when it does not know the platform of the user', async () => {
      openIntent('intent-1', signedInStore(MY_CALENDARS, undefined))

      await findMessage('unavailable')
      expect(sentOfType('ready')).toEqual([])
    })

    it('says the stack does not let Calendar read the intent (403)', async () => {
      sdk.fetchJSON.mockRejectedValue(new SdkError('/intents/intent-1', 403))
      openIntent()

      await findMessage('forbidden')
      expect(sentOfType('ready')).toEqual([])
    })

    it('says the session expired when it ends in another tab, and never shows the calendar in the frame', async () => {
      openIntent()
      await answerHandshake()
      await findForm()

      // Another tab of the calendar signs out
      const otherTab = new BroadcastChannel('twake-oidc-session')
      otherTab.postMessage({ type: 'session-ended', senderId: 'another-tab' })
      otherTab.close()

      await findMessage('sessionExpired')
      expect(redirectTo).not.toHaveBeenCalled()
      expect(window.location.pathname).toBe('/intents')
    })
  })

  describe('who frames the page', () => {
    it('serves the intent when only the client app frames it', async () => {
      stackIntent = { ...stackIntent, frameAncestors: [CHAT] }
      setAncestorOrigins([CHAT])
      openIntent()
      await answerHandshake()

      await findForm()
      expect(answers()).toEqual([])
    })

    it('cancels the intent when an unknown page frames the client app, and shows no form', async () => {
      stackIntent = { ...stackIntent, frameAncestors: [CHAT] }
      setAncestorOrigins([CHAT, 'https://evil.example'])
      openIntent()
      await answerHandshake()

      await findMessage('untrustedFrame')
      await waitFor(() =>
        expect(sentOfType('cancel')).toEqual([
          [{ type: 'intent-intent-1:cancel' }, CHAT]
        ])
      )
      expect(sentOfType('done')).toEqual([])
    })

    it('relies on the handshake when the stack does not give the origins (an older stack)', async () => {
      setAncestorOrigins([CHAT, 'https://evil.example'])
      openIntent()
      await answerHandshake()

      await findForm()
    })

    it('relies on the handshake when the browser does not tell the ancestors (Firefox)', async () => {
      stackIntent = { ...stackIntent, frameAncestors: [CHAT] }
      openIntent()
      await answerHandshake()

      await findForm()
    })
  })
})
