// First: the mocks of the harness must be in place when the app loads
import {
  CARD,
  EVENT_UID,
  NOTICE,
  answerHandshake,
  answers,
  calendarObject,
  closeButton,
  done,
  findPreview,
  found,
  foundAt,
  repliesWritten,
  replyButton,
  resetServers,
  settle,
  signedInStore,
  storedEvent,
  t
} from './openEventIntentHarness'
import type { Mock } from 'vitest'
import { fetchEventByUid } from '@common/features/Calendars/CalendarDAO'
import type { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import { fetchEventJCal, putEvent } from '@common/features/Events/EventDao'
import { IntentsApp } from '@private/IntentsApp'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'

// The reply Twake Chat asks for with the event, sent at once only when the
// event found is the one its card shows (openEventIntentHarness.ts)
const openIntent = (): void => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  render(
    <Provider store={signedInStore()}>
      <IntentsApp />
    </Provider>
  )
}

describe('the event Twake Chat opens with a reply to send', () => {
  beforeEach(resetServers)

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

      await user.click(closeButton())

      await waitFor(() => expect(answers()).toEqual([done('TENTATIVE')]))
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

      await user.click(closeButton())

      // Still no reply of the user
      await waitFor(() => expect(answers()).toEqual([done(null)]))
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
      [
        'the same instant written with a negative offset',
        { ...CARD, start: '2026-11-23T05:00:00-05:00' }
      ],
      [
        'the same instant written with milliseconds',
        { ...CARD, start: '2026-11-23T10:00:00.000Z' }
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
        await user.click(closeButton())
        await waitFor(() => expect(answers()).toEqual([done('ACCEPTED')]))
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

        await user.click(closeButton())

        await waitFor(() => expect(answers()).toEqual([done('DECLINED')]))
        expect(putEvent).not.toHaveBeenCalled()
      })

      it('gives the client no reply when the user had none and closes it without a click', async () => {
        const user = userEvent.setup()
        openIntent()
        await answerHandshake(asked())
        await findPreview()
        await settle()

        await user.click(closeButton())

        await waitFor(() => expect(answers()).toEqual([done(null)]))
        expect(putEvent).not.toHaveBeenCalled()
      })
    })
  })

  // CodeRabbit on PR #2218 (handleRSVPClick): the event is read again just
  // before the reply is written. Renamed or moved in between, it is no
  // longer the one the card shows: the reply asked is not sent.
  describe('the event changed between the lookup and the reply', () => {
    it.each([
      ['renamed', calendarObject({ title: 'Pizza Friday' })],
      ['moved one hour later', movedOneHourLater(calendarObject({}))]
    ])(
      'sends nothing and says the reply was not sent when the event read again was %s',
      async (_why, now) => {
        // The lookup finds the event of the card; the read before the write
        // gets it as it is now
        ;(fetchEventByUid as Mock).mockResolvedValue(foundAt(storedEvent()))
        ;(fetchEventJCal as Mock).mockImplementation(async () =>
          structuredClone(now)
        )
        openIntent()
        await answerHandshake({
          uid: EVENT_UID,
          partstat: 'ACCEPTED',
          expected: CARD
        })

        expect(
          await screen.findByText(NOTICE, undefined, { timeout: 10000 })
        ).toBeVisible()
        await settle()
        expect(putEvent).not.toHaveBeenCalled()
        expect(replyButton('ACCEPTED')).toHaveAttribute('aria-pressed', 'false')
      }
    )
  })

  describe('the notice that the reply was not sent', () => {
    // « This event changed since it was shared » (Clément, 2026-11-21): a
    // renamed or moved event is the normal path, not an attack, and the
    // reader must not believe they answered
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
      const stored = calendarObject({ title })
      ;(fetchEventByUid as Mock).mockImplementation(async () =>
        foundAt(structuredClone(stored))
      )
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
      expect(screen.getByText(NOTICE)).toBeInTheDocument()
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
})

// The event one hour later than the card: its DTSTART and DTEND moved
function movedOneHourLater(stored: VCalComponent): VCalComponent {
  const moved = structuredClone(stored)
  for (const component of moved[2] as VCalComponent[]) {
    for (const prop of component[1] as unknown as unknown[][]) {
      if (prop[0] === 'dtstart' || prop[0] === 'dtend') {
        prop[3] = String(prop[3]).replace(/T1(\d)/, (_, h) => `T1${+h + 1}`)
      }
    }
  }
  return moved
}
