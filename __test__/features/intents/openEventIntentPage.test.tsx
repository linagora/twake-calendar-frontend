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
import { IntentsApp } from '@private/IntentsApp'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import {
  askedHeights,
  askedSizes,
  installLayout,
  resizeContentTo,
  uninstallLayout
} from './layoutResizeObserver'

// Twake Chat shows a meeting in a room and opens it in Calendar, where the
// user replies to the invitation:
//   intents.create('OPEN', 'io.cozy.calendar.events', { uid, partstat?, expected? })
// The stack frames /intents?intent=<id> of Calendar in the dialog of Chat.
// The protocol with Chat is cozy-interapp's, the real one here (see
// newEventIntentPage.test.tsx): the page answers `done` with the reply of the
// user, `cancel` (null) or `error`.
const CHAT = 'https://chat.example.com'

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

const USER_ID = '667037022b752d0026472254'
const CAL_ID = `${USER_ID}/${USER_ID}`
const EVENT_UID = 'weekly-sync-1'

// What the user reads, in English (no interpolation: the counts are written
// out in the tests)
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
    [CAL_ID]: {
      id: CAL_ID,
      name: 'My calendar',
      link: `/calendars/${CAL_ID}.json`,
      color: { light: '#FF0000', dark: '#000' },
      owner: { emails: ['test@test.com'] },
      events: {}
    }
  }
}

type Reply = 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'

// The meeting Bob organizes, as the server stores it: Bob comes, the user
// (test@test.com) and Carol have not replied yet
const storedEvent = (userReply: Reply = 'NEEDS-ACTION'): VCalComponent =>
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

// The answer of the server to the lookup of the UID in the user's home
const found = (userReply?: Reply): unknown => ({
  _embedded: {
    'dav:item': [
      {
        _links: { self: { href: `/calendars/${CAL_ID}/${EVENT_UID}.ics` } },
        etag: '"1"',
        status: 200,
        data: storedEvent(userReply)
      }
    ]
  }
})

const notFound = (): Error =>
  Object.assign(new Error('Not Found'), { response: { status: 404 } })

// What the card of Twake Chat shows of this meeting: Calendar sends the reply
// at once only when the event it finds is that one (« Vérifier puis envoyer »,
// Clément, 2026-11-21): the UID comes from a message any member writes
const CARD = { title: 'Weekly sync', start: '2026-11-23T10:00:00Z' }

const OPEN_EVENT = {
  action: 'OPEN',
  type: 'io.cozy.calendar.events',
  frameAncestors: [CHAT]
}

const intentDocument = (id: string): unknown => ({
  data: {
    type: 'io.cozy.intents',
    id,
    attributes: {
      ...OPEN_EVENT,
      permissions: ['GET'],
      client: CHAT
    }
  }
})

const signedInStore = (): ReturnType<typeof setupStore> => {
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
    calendars: { ...initial.calendars, ...MY_CALENDARS }
  } as Parameters<typeof setupStore>[0])
}

const openIntent = (): void => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  render(
    <Provider store={signedInStore()}>
      <IntentsApp />
    </Provider>
  )
}

type Message = { type: string; document?: unknown; error?: unknown }
const sent = (): [Message, string][] =>
  client.postMessage.mock.calls as [Message, string][]
const sentOfType = (kind: string): [Message, string][] =>
  sent().filter(([message]) => message.type === `intent-intent-1:${kind}`)
// How the intent ends for the client: the reply, null, or an error
const answers = (): [Message, string][] =>
  sent().filter(([message]) =>
    /^intent-intent-1:(done|cancel|error|exposeFrameRemoval)$/.test(
      message.type
    )
  )

// Chat answers the `ready` of the page with the data of the intent
const answerHandshake = async (data: unknown): Promise<void> => {
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
const findPreview = async (): Promise<HTMLElement> =>
  screen.findByRole('heading', { name: 'Weekly sync' }, { timeout: 10000 })

const replyButton = (reply: Exclude<Reply, 'NEEDS-ACTION'>): HTMLElement =>
  screen.getByRole('button', { name: t(`eventPreview.${reply}`) })

const findMessage = async (kind: string): Promise<void> => {
  await screen.findByRole(
    'heading',
    { level: 1, name: t(`intents.${kind}.title`) },
    { timeout: 10000 }
  )
}

const settle = async (): Promise<void> =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50))
  })

// The replies written to the server: the PARTSTAT of the user in each jCal
const repliesWritten = (): unknown[] =>
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

const ASKED = { uid: EVENT_UID, partstat: 'ACCEPTED' }

describe('the event Twake Chat opens with a cozy-stack intent', () => {
  beforeEach(() => {
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
  })

  describe('the preview', () => {
    it('shows the event as the calendar previews it: its title, its date, its attendees with their replies, and asks whether the user comes', async () => {
      openIntent()
      await answerHandshake({ uid: EVENT_UID })

      await findPreview()
      expect(screen.getByText(/23 November 2026/)).toBeInTheDocument()
      expect(screen.getByText('3 participants')).toBeInTheDocument()
      expect(screen.getByText('1 yes, 2 waiting')).toBeInTheDocument()
      expect(
        screen.getByText(t('eventPreview.attendingQuestion'))
      ).toBeInTheDocument()
      expect(replyButton('ACCEPTED')).toBeEnabled()
      expect(replyButton('DECLINED')).toBeEnabled()
      expect(replyButton('TENTATIVE')).toBeEnabled()
      // Looked up in the calendars of the user, nothing written
      expect(
        ((fetchEventByUid as Mock).mock.calls as [string, string][]).map(
          ([home, uid]) => [home, uid]
        )
      ).toContainEqual([USER_ID, EVENT_UID])
      expect(putEvent).not.toHaveBeenCalled()
      expect(answers()).toEqual([])
    })

    it('draws the preview in the page itself, not in a dialog of its own', async () => {
      openIntent()
      await answerHandshake({ uid: EVENT_UID })

      const title = await findPreview()
      // Chat draws the dialog around the frame: inside, the preview is the page
      expect(title.closest('[role="dialog"]')).toBeNull()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(document.querySelector('.MuiBackdrop-root')).toBeNull()
      expect(screen.getByRole('main')).toContainElement(title)
    })

    it('tells the client it is ready and hides its close button once the event shows', async () => {
      openIntent()
      await answerHandshake({ uid: EVENT_UID })

      await findPreview()
      // The preview has its own close button
      expect(
        screen.getByRole('button', { name: t('actions.close') })
      ).toBeVisible()
      await waitFor(() => expect(sentOfType('readyToUse')).toHaveLength(1))
      expect(sentOfType('hideCross')).toHaveLength(1)
      await settle()
      expect(sentOfType('readyToUse')).toHaveLength(1)
      expect(sentOfType('hideCross')).toHaveLength(1)
    })

    it('shows a loader while the event loads, and tells the client nothing', async () => {
      ;(fetchEventByUid as Mock).mockReturnValue(new Promise(() => {}))
      openIntent()
      await answerHandshake({ uid: EVENT_UID })

      await waitFor(() => expect(fetchEventByUid).toHaveBeenCalled())
      await settle()
      expect(screen.getByTestId('loading')).toBeInTheDocument()
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
      expect(answers()).toEqual([])
    })

    // The width of the preview in its own dialog of the calendar (the paper
    // of ResponsiveDialog, 570 px): Chat's dialog starts at 900 px and keeps
    // the width the page asks for, or that one when it asks none
    const PREVIEW_WIDTH = 570

    it('asks the client for the width the preview has in the calendar and the height of the preview once it shows', async () => {
      installLayout(480)
      onTestFinished(uninstallLayout)
      openIntent()
      await answerHandshake({ uid: EVENT_UID })

      await findPreview()
      await waitFor(() =>
        expect(sentOfType('resize').length).toBeGreaterThan(0)
      )
      expect(askedSizes(sentOfType('resize'))[0]).toEqual({
        width: PREVIEW_WIDTH,
        height: 480
      })
      for (const [, target] of sentOfType('resize')) expect(target).toBe(CHAT)
    })

    it('asks again for the new height when the preview grows, and keeps the width', async () => {
      installLayout(480)
      onTestFinished(uninstallLayout)
      openIntent()
      await answerHandshake({ uid: EVENT_UID })
      await findPreview()
      await waitFor(() =>
        expect(askedHeights(sentOfType('resize'))).toContain(480)
      )

      resizeContentTo(560)

      await waitFor(() =>
        expect(askedHeights(sentOfType('resize')).at(-1)).toBe(560)
      )
      expect(askedSizes(sentOfType('resize')).at(-1)).toEqual({
        width: PREVIEW_WIDTH,
        height: 560
      })
      for (const { width } of askedSizes(sentOfType('resize'))) {
        expect(width).toBe(PREVIEW_WIDTH)
      }
    })
  })

  describe('the reply the client asks for', () => {
    it('sends the reply first, without a click, then shows it as the reply of the user', async () => {
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'ACCEPTED',
        expected: CARD
      })

      await findPreview()
      await waitFor(() => expect(repliesWritten()).toEqual(['ACCEPTED']))
      await waitFor(() =>
        expect(replyButton('ACCEPTED')).toHaveAttribute('aria-pressed', 'true')
      )
      expect(replyButton('DECLINED')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByText('2 yes, 1 waiting')).toBeInTheDocument()
      // The intent goes on: the user may still change it, then close
      expect(answers()).toEqual([])
    })

    it('gives the client that reply once the user closes the preview', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'TENTATIVE',
        expected: CARD
      })
      await findPreview()
      await waitFor(() => expect(repliesWritten()).toEqual(['TENTATIVE']))

      await user.click(screen.getByRole('button', { name: t('actions.close') }))

      await waitFor(() =>
        expect(answers()).toEqual([
          [
            {
              type: 'intent-intent-1:done',
              document: { partstat: 'TENTATIVE' }
            },
            CHAT
          ]
        ])
      )
    })

    it('keeps the former reply when the server refuses the new one, and says so', async () => {
      ;(putEvent as Mock).mockResolvedValue(new Response(null, { status: 500 }))
      const user = userEvent.setup()
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'DECLINED',
        expected: CARD
      })
      await findPreview()

      // The message the calendar shows for a reply it could not save
      const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
      expect(alert).toHaveTextContent(t('error.participationUpdateFailed'))
      expect(replyButton('DECLINED')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByText('1 yes, 2 waiting')).toBeInTheDocument()
      expect(answers()).toEqual([])

      await user.click(screen.getByRole('button', { name: t('actions.close') }))

      // Still no reply of the user
      await waitFor(() =>
        expect(answers()).toEqual([
          [{ type: 'intent-intent-1:done', document: { partstat: null } }, CHAT]
        ])
      )
    })
  })

  // « Vérifier puis envoyer » (Clément, 2026-11-21): the UID comes from a
  // message any room member writes, so a forged card « Pizza Friday » could
  // carry the UID of another meeting the user is invited to. The reply is
  // sent at once only when the event found is the one the card shows.
  describe('the reply asked, checked against what the card shows', () => {
    it.each([
      [
        'the same instant written with another offset',
        { ...CARD, start: '2026-11-23T11:00:00+01:00' }
      ],
      ['the title with spaces around it', { ...CARD, title: '  Weekly sync ' }]
    ])(
      'still sends the reply at once when the card shows the same event: %s',
      async (_, expected) => {
        openIntent()
        await answerHandshake({
          uid: EVENT_UID,
          partstat: 'ACCEPTED',
          expected
        })

        await findPreview()
        await waitFor(() => expect(repliesWritten()).toEqual(['ACCEPTED']))
        await waitFor(() =>
          expect(replyButton('ACCEPTED')).toHaveAttribute(
            'aria-pressed',
            'true'
          )
        )
      }
    )

    describe.each([
      [
        'its title is not the one of the event',
        { ...CARD, title: 'Pizza Friday' }
      ],
      ['its title differs by the case', { ...CARD, title: 'weekly sync' }],
      [
        'its start is not the one of the event',
        { ...CARD, start: '2026-11-23T11:00:00Z' }
      ],
      ['it sends no expected title and start', undefined]
    ])('when %s', (_why, expected) => {
      const asked = (partstat = 'ACCEPTED'): Record<string, unknown> => ({
        uid: EVENT_UID,
        partstat,
        ...(expected === undefined ? {} : { expected })
      })

      it('shows the preview and sends nothing to the server until the user clicks a reply', async () => {
        openIntent()
        await answerHandshake(asked())

        await findPreview()
        await settle()
        expect(putEvent).not.toHaveBeenCalled()
        // The reply of the user is what it was: nothing is applied
        for (const reply of ['ACCEPTED', 'DECLINED', 'TENTATIVE'] as const) {
          expect(replyButton(reply)).toHaveAttribute('aria-pressed', 'false')
        }
        expect(screen.getByText('1 yes, 2 waiting')).toBeInTheDocument()
        expect(answers()).toEqual([])
      })

      it('sends one reply, and gives it to the client, once the user clicks one', async () => {
        const user = userEvent.setup()
        openIntent()
        await answerHandshake(asked())
        await findPreview()
        await settle()

        await user.click(replyButton('ACCEPTED'))

        await waitFor(() => expect(repliesWritten()).toEqual(['ACCEPTED']))
        await waitFor(() =>
          expect(replyButton('ACCEPTED')).toHaveAttribute(
            'aria-pressed',
            'true'
          )
        )
        await user.click(
          screen.getByRole('button', { name: t('actions.close') })
        )
        await waitFor(() =>
          expect(answers()).toEqual([
            [
              {
                type: 'intent-intent-1:done',
                document: { partstat: 'ACCEPTED' }
              },
              CHAT
            ]
          ])
        )
        expect(putEvent).toHaveBeenCalledTimes(1)
      })

      it('gives the client the reply the user had when they close it without a click', async () => {
        ;(fetchEventByUid as Mock).mockResolvedValue(found('DECLINED'))
        ;(fetchEventJCal as Mock).mockResolvedValue(storedEvent('DECLINED'))
        const user = userEvent.setup()
        openIntent()
        await answerHandshake(asked('ACCEPTED'))
        await findPreview()
        await settle()
        expect(replyButton('DECLINED')).toHaveAttribute('aria-pressed', 'true')

        await user.click(
          screen.getByRole('button', { name: t('actions.close') })
        )

        await waitFor(() =>
          expect(answers()).toEqual([
            [
              {
                type: 'intent-intent-1:done',
                document: { partstat: 'DECLINED' }
              },
              CHAT
            ]
          ])
        )
        expect(putEvent).not.toHaveBeenCalled()
      })

      it('gives the client no reply when the user had none and closes it without a click', async () => {
        const user = userEvent.setup()
        openIntent()
        await answerHandshake(asked())
        await findPreview()
        await settle()

        await user.click(
          screen.getByRole('button', { name: t('actions.close') })
        )

        await waitFor(() =>
          expect(answers()).toEqual([
            [
              { type: 'intent-intent-1:done', document: { partstat: null } },
              CHAT
            ]
          ])
        )
        expect(putEvent).not.toHaveBeenCalled()
      })
    })
  })

  describe('the notice that the reply was not sent', () => {
    // « This event changed since it was shared » (Clément, 2026-11-21): a
    // renamed or moved event is the normal path, not an attack, and the
    // reader must not believe they answered
    const NOTICE =
      'This event changed since it was shared: your answer was not sent. Choose it below.'

    it.each([
      ['its title is not the one of the event', { ...CARD, title: 'Pizza' }],
      [
        'its start is not the one of the event',
        { ...CARD, start: '2026-11-23T11:00:00Z' }
      ],
      ['it sends no expected title and start', undefined]
    ])(
      'tells the reply was not sent when a partstat came and %s',
      async (_why, expected) => {
        openIntent()
        await answerHandshake({
          uid: EVENT_UID,
          partstat: 'ACCEPTED',
          ...(expected === undefined ? {} : { expected })
        })

        await findPreview()
        expect(screen.getByText(NOTICE)).toBeInTheDocument()
        // One line above the reply section
        expect(
          screen
            .getByText(NOTICE)
            .compareDocumentPosition(
              screen.getByText(t('eventPreview.attendingQuestion'))
            ) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy()
      }
    )

    it('says nothing when the reply was sent because the card shows the same event', async () => {
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'ACCEPTED',
        expected: CARD
      })

      await findPreview()
      await waitFor(() => expect(repliesWritten()).toEqual(['ACCEPTED']))
      expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
    })

    it.each([
      [
        'no partstat and a card that matches',
        { uid: EVENT_UID, expected: CARD }
      ],
      [
        'no partstat and a card that does not match',
        { uid: EVENT_UID, expected: { ...CARD, title: 'Pizza' } }
      ],
      ['nothing but the uid', { uid: EVENT_UID }]
    ])('says nothing when OPEN came with %s', async (_why, data) => {
      openIntent()
      await answerHandshake(data)

      await findPreview()
      await settle()
      expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
    })

    it('goes once the user clicks a reply', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'ACCEPTED',
        expected: { ...CARD, title: 'Pizza' }
      })
      await findPreview()
      expect(screen.getByText(NOTICE)).toBeInTheDocument()

      await user.click(replyButton('DECLINED'))

      await waitFor(() =>
        expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
      )
    })
  })

  describe('a title longer than Chat sends', () => {
    // Chat cuts the title of the card at 200 characters before it sends
    // `expected`: a longer title never matches, which is the safe outcome
    // (the mismatch path), with no special case
    const MAX = 200
    const serveTitle = (title: string): void => {
      const stored = storedEvent()
      const vevent = (stored[2] as VCalComponent[])[0]
      const summary = (vevent[1] as unknown[][]).find(
        ([name]) => name === 'summary'
      ) as unknown[]
      summary[3] = title
      ;(fetchEventByUid as Mock).mockImplementation(async () => ({
        _embedded: {
          'dav:item': [
            {
              _links: {
                self: { href: `/calendars/${CAL_ID}/${EVENT_UID}.ics` }
              },
              etag: '"1"',
              status: 200,
              data: structuredClone(stored)
            }
          ]
        }
      }))
      ;(fetchEventJCal as Mock).mockImplementation(async () =>
        structuredClone(stored)
      )
    }

    it('falls into the mismatch path: the notice and the preview, nothing written', async () => {
      const title = 'x'.repeat(MAX + 1)
      serveTitle(title)
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'ACCEPTED',
        expected: { title: title.slice(0, MAX), start: CARD.start }
      })

      await screen.findByRole('heading', { name: title }, { timeout: 10000 })
      await settle()
      expect(putEvent).not.toHaveBeenCalled()
      expect(replyButton('ACCEPTED')).toHaveAttribute('aria-pressed', 'false')
      expect(
        screen.getByText(
          'This event changed since it was shared: your answer was not sent. Choose it below.'
        )
      ).toBeInTheDocument()
    })

    it('still sends the reply at once for a title of exactly 200 characters', async () => {
      const title = 'x'.repeat(MAX)
      serveTitle(title)
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'ACCEPTED',
        expected: { title, start: CARD.start }
      })

      await screen.findByRole('heading', { name: title }, { timeout: 10000 })
      await waitFor(() => expect(repliesWritten()).toEqual(['ACCEPTED']))
    })
  })

  describe('the reply of the user', () => {
    it('gives the client the reply the user picks in the preview, once they close it', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake({ uid: EVENT_UID })
      await findPreview()

      await user.click(replyButton('DECLINED'))
      await waitFor(() => expect(repliesWritten()).toEqual(['DECLINED']))
      await waitFor(() =>
        expect(replyButton('DECLINED')).toHaveAttribute('aria-pressed', 'true')
      )
      expect(answers()).toEqual([])
      await user.click(screen.getByRole('button', { name: t('actions.close') }))

      await waitFor(() =>
        expect(answers()).toEqual([
          [
            {
              type: 'intent-intent-1:done',
              document: { partstat: 'DECLINED' }
            },
            CHAT
          ]
        ])
      )
    })

    it('gives the client the reply the user already gave, when they close it without a new one', async () => {
      ;(fetchEventByUid as Mock).mockResolvedValue(found('ACCEPTED'))
      ;(fetchEventJCal as Mock).mockResolvedValue(storedEvent('ACCEPTED'))
      const user = userEvent.setup()
      openIntent()
      await answerHandshake({ uid: EVENT_UID })
      await findPreview()

      await user.click(screen.getByRole('button', { name: t('actions.close') }))

      await waitFor(() =>
        expect(answers()).toEqual([
          [
            {
              type: 'intent-intent-1:done',
              document: { partstat: 'ACCEPTED' }
            },
            CHAT
          ]
        ])
      )
      expect(putEvent).not.toHaveBeenCalled()
    })

    it('gives the client no reply when the user closes it without replying', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake({ uid: EVENT_UID })
      await findPreview()

      await user.click(screen.getByRole('button', { name: t('actions.close') }))

      await waitFor(() =>
        expect(answers()).toEqual([
          [{ type: 'intent-intent-1:done', document: { partstat: null } }, CHAT]
        ])
      )
      expect(putEvent).not.toHaveBeenCalled()
    })
  })

  describe('an event the page cannot show', () => {
    it('says the event cannot be found, and gives the client null', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake({ uid: 'deleted-meeting' })

      // The calendar's text for a UID it cannot find (error.eventNotFound)
      expect(
        await screen.findByText(t('error.eventNotFound'), undefined, {
          timeout: 10000
        })
      ).toBeVisible()
      expect(screen.queryByRole('heading', { name: 'Weekly sync' })).toBeNull()
      expect(putEvent).not.toHaveBeenCalled()
      // Told at once, or once the user closed the message
      const close = screen.queryByRole('button', { name: t('actions.close') })
      if (answers().length === 0 && close) await user.click(close)

      await waitFor(() =>
        expect(answers()).toEqual([[{ type: 'intent-intent-1:cancel' }, CHAT]])
      )
    })

    it('says it failed and gives the client an error when the calendar server cannot be reached', async () => {
      ;(fetchEventByUid as Mock).mockRejectedValue(
        Object.assign(new Error('Server down'), { response: { status: 500 } })
      )
      openIntent()
      await answerHandshake({ uid: EVENT_UID })

      await findMessage('failed')
      await waitFor(() => expect(sentOfType('error')).toHaveLength(1))
      expect(answers()).toEqual(sentOfType('error'))
    })

    it.each([
      ['no data', undefined],
      ['no UID', {}],
      ['an empty UID', { uid: '' }],
      ['a UID that is no string', { uid: 42 }],
      ['the UID alone', EVENT_UID],
      ['a list', [EVENT_UID]],
      ['a reply Calendar does not know', { uid: EVENT_UID, partstat: 'YES' }],
      [
        'a reply that is no reply',
        { uid: EVENT_UID, partstat: 'NEEDS-ACTION' }
      ],
      ['an expected that is a string', { ...ASKED, expected: 'Weekly sync' }],
      ['an expected that is a number', { ...ASKED, expected: 42 }],
      [
        'an expected that is a list',
        { ...ASKED, expected: [CARD.title, CARD.start] }
      ],
      [
        'an expected title that is no string',
        { ...ASKED, expected: { ...CARD, title: 42 } }
      ],
      [
        'an expected without a title',
        { ...ASKED, expected: { start: CARD.start } }
      ],
      [
        'an expected start that is no string',
        { ...ASKED, expected: { ...CARD, start: 1763892000000 } }
      ],
      [
        'an expected start that is no date',
        { ...ASKED, expected: { ...CARD, start: 'next friday' } }
      ],
      [
        'an expected without a start',
        { ...ASKED, expected: { title: CARD.title } }
      ]
    ])(
      'fails an event asked with data of another shape: %s',
      async (_, data) => {
        openIntent()
        await answerHandshake(data)

        // Why, in the words of the page (the text of CREATE speaks of a new
        // event): never that Calendar does not serve OPEN
        const heading = await screen.findByRole(
          'heading',
          { level: 1 },
          { timeout: 10000 }
        )
        expect(heading).not.toHaveTextContent(t('intents.unsupported.title'))
        expect(
          screen.queryByRole('heading', { name: 'Weekly sync' })
        ).toBeNull()
        await waitFor(() => expect(sentOfType('error')).toHaveLength(1))
        expect(answers()).toHaveLength(1)
        expect(putEvent).not.toHaveBeenCalled()
      }
    )
  })

  // The calendar server of the cases below keeps what it is sent: the lookup
  // and the reads give back the last event written, a reply included
  describe('the events of other shapes', () => {
    // Today is 20 November 2026, before every occurrence below: a reply
    // leaves a past occurrence as it is, and the real clock would pass them
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-11-20T09:00:00Z'))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    // A VEVENT of the meeting Bob organizes. `user`: the reply of the user,
    // null when they are not an attendee of that VEVENT
    type Vevent = {
      user?: Reply | null
      recurrenceId?: string
      isSeries?: boolean
      status?: string
    }
    const vevent = ({
      user = 'NEEDS-ACTION',
      recurrenceId,
      isSeries = false,
      status
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
          ['summary', {}, 'text', 'Weekly sync'],
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
          ...(user === null
            ? []
            : [
                [
                  'attendee',
                  {
                    cn: 'test',
                    partstat: user,
                    rsvp: 'TRUE',
                    role: 'REQ-PARTICIPANT'
                  },
                  'cal-address',
                  'mailto:test@test.com'
                ]
              ]),
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
    }
    const calendarObject = (...vevents: Vevent[]): VCalComponent =>
      ['vcalendar', [], vevents.map(vevent)] as unknown as VCalComponent

    const NEXT_WEEK = '2026-11-30T10:00:00Z'

    // The server holds `stored` at `href`; a reply is answered by `answer`
    const serve = (
      stored: VCalComponent,
      {
        href = `/calendars/${CAL_ID}/${EVENT_UID}.ics`,
        answer = async (): Promise<Response> =>
          new Response(null, { status: 204 })
      }: { href?: string; answer?: () => Promise<Response> } = {}
    ): void => {
      let current = stored
      const read = (): VCalComponent => structuredClone(current)
      ;(fetchEventByUid as Mock).mockImplementation(
        async (home: string, uid: string) => {
          if (home !== USER_ID || uid !== EVENT_UID) throw notFound()
          return {
            _embedded: {
              'dav:item': [
                {
                  _links: { self: { href } },
                  etag: '"1"',
                  status: 200,
                  data: read()
                }
              ]
            }
          }
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
    const writes = (): unknown[] => [
      ...(putEvent as Mock).mock.calls,
      ...((api as unknown as Mock).mock?.calls ?? []).filter(
        ([, init]) =>
          (init as RequestInit | undefined)?.method !== undefined &&
          (init as RequestInit).method !== 'GET'
      )
    ]

    // The reply of the user in the VEVENT of a jCal written: the master, or
    // the override of that RECURRENCE-ID
    const userReplyIn = (
      jCal: VCalComponent,
      recurrenceId?: string
    ): string | undefined => {
      type Prop = [string, Record<string, string>, string, unknown]
      const vevent = (jCal[2] as VCalComponent[]).find(component => {
        if (component[0] !== 'vevent') return false
        const id = (component[1] as Prop[]).find(
          ([name]) => name === 'recurrence-id'
        )?.[3]
        return recurrenceId === undefined
          ? id === undefined
          : id === recurrenceId
      })
      const user = ((vevent?.[1] ?? []) as Prop[]).find(
        ([name, , , value]) =>
          name === 'attendee' && /test@test\.com$/i.test(String(value))
      )
      return user?.[1].partstat
    }
    const written = (): VCalComponent[] =>
      ((putEvent as Mock).mock.calls as [unknown, VCalComponent][]).map(
        ([, jCal]) => jCal
      )

    const closePreview = async (): Promise<void> => {
      await userEvent
        .setup()
        .click(screen.getByRole('button', { name: t('actions.close') }))
    }

    describe('a user who is not an attendee', () => {
      it.each([
        ['without a reply asked', { uid: EVENT_UID }],
        [
          'with a reply asked',
          { uid: EVENT_UID, partstat: 'ACCEPTED', expected: CARD }
        ]
      ])(
        'shows the preview without the question whether they come, and gives the client no reply on close (%s)',
        async (_, data) => {
          serve(calendarObject({ user: null }))
          openIntent()
          await answerHandshake(data)

          await findPreview()
          expect(
            screen.queryByText(t('eventPreview.attendingQuestion'))
          ).toBeNull()
          for (const reply of ['ACCEPTED', 'DECLINED', 'TENTATIVE']) {
            expect(
              screen.queryByRole('button', { name: t(`eventPreview.${reply}`) })
            ).toBeNull()
          }
          await settle()
          expect(writes()).toEqual([])
          expect(answers()).toEqual([])

          await closePreview()

          await waitFor(() =>
            expect(answers()).toEqual([
              [
                { type: 'intent-intent-1:done', document: { partstat: null } },
                CHAT
              ]
            ])
          )
          expect(writes()).toEqual([])
        }
      )
    })

    describe('a recurring series', () => {
      // The card of a series shows the start of its master, or of the
      // occurrence the message is about (its RECURRENCE-ID)
      it('sends the reply at once when the card shows the start of an occurrence of the series', async () => {
        serve(
          calendarObject(
            { isSeries: true },
            { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION' }
          )
        )
        openIntent()
        await answerHandshake({
          uid: EVENT_UID,
          partstat: 'ACCEPTED',
          expected: { ...CARD, start: NEXT_WEEK }
        })

        await findPreview()
        await waitFor(() => expect(writes()).toHaveLength(1))
      })

      it('sends nothing, and shows the preview, when the card shows a start that is neither the master nor an occurrence', async () => {
        serve(
          calendarObject(
            { isSeries: true },
            { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION' }
          )
        )
        openIntent()
        await answerHandshake({
          uid: EVENT_UID,
          partstat: 'ACCEPTED',
          expected: { ...CARD, start: '2026-12-07T10:00:00Z' }
        })

        await findPreview()
        await settle()
        expect(writes()).toEqual([])
        expect(replyButton('ACCEPTED')).toHaveAttribute('aria-pressed', 'false')
      })

      it('replies for the whole series without asking which occurrences: one reply, on the master, shown in the preview', async () => {
        serve(calendarObject({ isSeries: true }))
        openIntent()
        await answerHandshake({
          uid: EVENT_UID,
          partstat: 'ACCEPTED',
          expected: CARD
        })

        await findPreview()
        await waitFor(() =>
          expect(replyButton('ACCEPTED')).toHaveAttribute(
            'aria-pressed',
            'true'
          )
        )
        // No « this occurrence or all of them? »
        expect(screen.queryByRole('dialog')).toBeNull()
        await settle()
        expect(writes()).toHaveLength(1)
        expect(userReplyIn(written()[0])).toBe('ACCEPTED')
        expect(screen.getByText('2 yes, 1 waiting')).toBeInTheDocument()

        await closePreview()
        await waitFor(() =>
          expect(answers()).toEqual([
            [
              {
                type: 'intent-intent-1:done',
                document: { partstat: 'ACCEPTED' }
              },
              CHAT
            ]
          ])
        )
      })

      it('gives the reply to the occurrences of the series the user is invited to as well', async () => {
        serve(
          calendarObject(
            { isSeries: true },
            { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION' }
          )
        )
        openIntent()
        await answerHandshake({
          uid: EVENT_UID,
          partstat: 'DECLINED',
          expected: CARD
        })

        await findPreview()
        await waitFor(() =>
          expect(replyButton('DECLINED')).toHaveAttribute(
            'aria-pressed',
            'true'
          )
        )
        expect(screen.queryByRole('dialog')).toBeNull()
        await settle()
        expect(writes()).toHaveLength(1)
        expect(userReplyIn(written()[0])).toBe('DECLINED')
        expect(userReplyIn(written()[0], NEXT_WEEK)).toBe('DECLINED')
      })
    })

    describe('a user invited to one occurrence of a series only', () => {
      it.each([
        [
          'the master without the user, and the occurrence with them',
          calendarObject(
            { isSeries: true, user: null },
            { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION' }
          ),
          CARD.start
        ],
        [
          'the occurrence alone',
          calendarObject({ recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION' }),
          NEXT_WEEK
        ]
      ])(
        'records the reply asked for that occurrence and shows it once the event is loaded again (%s)',
        async (_, stored, start) => {
          serve(stored)
          openIntent()
          await answerHandshake({
            uid: EVENT_UID,
            partstat: 'ACCEPTED',
            expected: { ...CARD, start }
          })

          await findPreview()
          await waitFor(() => expect(written().length).toBeGreaterThan(0))
          expect(userReplyIn(written().slice(-1)[0], NEXT_WEEK)).toBe(
            'ACCEPTED'
          )
          await waitFor(() =>
            expect(replyButton('ACCEPTED')).toHaveAttribute(
              'aria-pressed',
              'true'
            )
          )
          expect(screen.queryByRole('dialog')).toBeNull()

          await closePreview()
          await waitFor(() =>
            expect(answers()).toEqual([
              [
                {
                  type: 'intent-intent-1:done',
                  document: { partstat: 'ACCEPTED' }
                },
                CHAT
              ]
            ])
          )
        }
      )
    })

    describe('a cancelled event', () => {
      it.each([
        ['without a reply asked', { uid: EVENT_UID }],
        [
          'with a reply asked',
          { uid: EVENT_UID, partstat: 'ACCEPTED', expected: CARD }
        ]
      ])(
        'says the event was cancelled, writes nothing, then cancels the intent (%s)',
        async (_, data) => {
          serve(calendarObject({ status: 'CANCELLED' }))
          const user = userEvent.setup()
          openIntent()
          await answerHandshake(data)

          expect(
            await screen.findByText(t('error.eventCanceled'), undefined, {
              timeout: 10000
            })
          ).toBeVisible()
          expect(
            screen.queryByRole('heading', { name: 'Weekly sync' })
          ).toBeNull()
          // Told at once, or once the user closed the message
          const close = screen.queryByRole('button', {
            name: t('actions.close')
          })
          if (answers().length === 0 && close) await user.click(close)

          await waitFor(() =>
            expect(answers()).toEqual([
              [{ type: 'intent-intent-1:cancel' }, CHAT]
            ])
          )
          expect(writes()).toEqual([])
        }
      )
    })

    describe('an event found in no calendar of the user', () => {
      it('says it failed and gives the client an error', async () => {
        // The server finds the UID, in a calendar the user does not list
        serve(calendarObject({}), {
          href: '/calendars/someone-else/someone-else/weekly-sync-1.ics'
        })
        openIntent()
        await answerHandshake({ uid: EVENT_UID })

        await findMessage('failed')
        await waitFor(() => expect(sentOfType('error')).toHaveLength(1))
        expect(answers()).toEqual(sentOfType('error'))
        expect(writes()).toEqual([])
      })
    })

    describe('a close while the reply the user clicked is in flight', () => {
      it('gives the client the reply being sent once the server confirmed it, never the former one', async () => {
        let confirm: (response: Response) => void = () => undefined
        serve(calendarObject({ user: 'ACCEPTED' }), {
          answer: () =>
            new Promise<Response>(resolve => {
              confirm = resolve
            })
        })
        const user = userEvent.setup()
        openIntent()
        await answerHandshake({ uid: EVENT_UID })
        await findPreview()

        await user.click(replyButton('DECLINED'))
        await waitFor(() => expect(putEvent).toHaveBeenCalledTimes(1))
        await user.click(
          screen.getByRole('button', { name: t('actions.close') })
        )
        await settle()
        // Not the former reply while the new one is in flight
        expect(answers()).toEqual([])

        act(() => confirm(new Response(null, { status: 204 })))

        await waitFor(() =>
          expect(answers()).toEqual([
            [
              {
                type: 'intent-intent-1:done',
                document: { partstat: 'DECLINED' }
              },
              CHAT
            ]
          ])
        )
        await settle()
        expect(answers()).toHaveLength(1)
      })

      it('gives the client the reply clicked on an occurrence once the event, loaded again, shows it', async () => {
        serve(calendarObject({ recurrenceId: NEXT_WEEK, user: 'TENTATIVE' }))
        // The first lookup answers; the reload after the reply waits
        const lookUp = (fetchEventByUid as Mock).getMockImplementation()!
        let reloaded: () => void = () => undefined
        ;(fetchEventByUid as Mock)
          .mockImplementationOnce(lookUp)
          .mockImplementation(async (...args: unknown[]) => {
            await new Promise<void>(resolve => {
              reloaded = resolve
            })
            return lookUp(...args)
          })
        const user = userEvent.setup()
        openIntent()
        await answerHandshake({ uid: EVENT_UID })
        await findPreview()

        await user.click(replyButton('DECLINED'))
        await waitFor(() => expect(written()).toHaveLength(1))
        expect(userReplyIn(written()[0], NEXT_WEEK)).toBe('DECLINED')
        await waitFor(() => expect(fetchEventByUid).toHaveBeenCalledTimes(2))
        await user.click(
          screen.getByRole('button', { name: t('actions.close') })
        )
        await settle()
        // Not the former reply while the event is loaded again
        expect(answers()).toEqual([])

        act(() => reloaded())

        await waitFor(() =>
          expect(answers()).toEqual([
            [
              {
                type: 'intent-intent-1:done',
                document: { partstat: 'DECLINED' }
              },
              CHAT
            ]
          ])
        )
        await settle()
        expect(answers()).toHaveLength(1)
      })

      it.each([
        ['an event', calendarObject({ user: 'TENTATIVE' })],
        [
          'an occurrence',
          calendarObject({ recurrenceId: NEXT_WEEK, user: 'TENTATIVE' })
        ]
      ])(
        'gives the client the former reply once the server refused the one clicked (%s)',
        async (_, stored) => {
          let refuse: (response: Response) => void = () => undefined
          serve(stored, {
            answer: () =>
              new Promise<Response>(resolve => {
                refuse = resolve
              })
          })
          const user = userEvent.setup()
          openIntent()
          await answerHandshake({ uid: EVENT_UID })
          await findPreview()

          await user.click(replyButton('DECLINED'))
          await waitFor(() => expect(putEvent).toHaveBeenCalledTimes(1))
          await user.click(
            screen.getByRole('button', { name: t('actions.close') })
          )
          await settle()
          expect(answers()).toEqual([])

          act(() => refuse(new Response(null, { status: 500 })))

          await waitFor(() =>
            expect(answers()).toEqual([
              [
                {
                  type: 'intent-intent-1:done',
                  document: { partstat: 'TENTATIVE' }
                },
                CHAT
              ]
            ])
          )
          await settle()
          expect(answers()).toHaveLength(1)
        }
      )

      // Chat's close button is hidden (hideCross): the close of the page is
      // the only way out, so it waits for the server 10 s at most
      it.each([
        ['an event', calendarObject({ user: 'TENTATIVE' })],
        [
          'an occurrence',
          calendarObject({ recurrenceId: NEXT_WEEK, user: 'TENTATIVE' })
        ]
      ])(
        'gives the client the former reply and closes, once the server has not answered the one clicked for 10 s (%s)',
        async (_, stored) => {
          // The reply is sent, and the server never answers it
          serve(stored, { answer: () => new Promise<Response>(() => {}) })
          const user = userEvent.setup()
          openIntent()
          await answerHandshake({ uid: EVENT_UID })
          await findPreview()
          await user.click(replyButton('DECLINED'))
          await waitFor(() => expect(putEvent).toHaveBeenCalledTimes(1))
          // The clock of the time limit, from the close on: the rest of the
          // page runs as it would
          vi.useFakeTimers({ shouldAdvanceTime: true })
          vi.setSystemTime(new Date('2026-11-20T09:00:00Z'))

          await user.click(
            screen.getByRole('button', { name: t('actions.close') })
          )
          await act(async () => {
            await vi.advanceTimersByTimeAsync(9_000)
          })
          // Still waiting for the server
          expect(answers()).toEqual([])

          await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000)
          })

          await waitFor(() =>
            expect(answers()).toEqual([
              [
                {
                  type: 'intent-intent-1:done',
                  document: { partstat: 'TENTATIVE' }
                },
                CHAT
              ]
            ])
          )
          await settle()
          expect(answers()).toHaveLength(1)
        }
      )
    })
  })
})
