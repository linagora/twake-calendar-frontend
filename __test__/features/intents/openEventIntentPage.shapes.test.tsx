// First: the mocks of the harness must be in place when the app loads
import {
  CARD,
  CHAT,
  EVENT_UID,
  IN_TWO_WEEKS,
  NEXT_WEEK,
  NOTICE,
  answerHandshake,
  answers,
  calendarObject,
  closePreview,
  done,
  fakeTodayBeforeTheMeetings,
  findMessage,
  findPreview,
  replyButton,
  resetServers,
  sentOfType,
  serve,
  settle,
  signedInStore,
  t,
  userReplyIn,
  writes,
  written
} from './openEventIntentHarness'
import type { Mock } from 'vitest'
import { fetchEventJCal } from '@common/features/Events/EventDao'
import { IntentsApp } from '@private/IntentsApp'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'

// The events of other shapes than one meeting the user is invited to: not
// invited, a series, one occurrence, cancelled, out of the user's calendars.
// The calendar server keeps what it is sent (serve, openEventIntentHarness.ts)
const openIntent = (): void => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  render(
    <Provider store={signedInStore()}>
      <IntentsApp />
    </Provider>
  )
}

describe('the events of other shapes Twake Chat opens', () => {
  beforeEach(resetServers)
  fakeTodayBeforeTheMeetings()

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

        await waitFor(() => expect(answers()).toEqual([done(null)]))
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

    // CodeRabbit on PR #2218 (round 2): the WEEKLY rule generates every
    // Monday at 10:00 (IN_TWO_WEEKS among them); a Wednesday is none of them
    it('sends nothing, and shows the preview, when the card shows a start the series never has', async () => {
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
        expected: { ...CARD, start: '2026-12-02T10:00:00Z' }
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
        expect(replyButton('ACCEPTED')).toHaveAttribute('aria-pressed', 'true')
      )
      // No « this occurrence or all of them? »
      expect(screen.queryByRole('dialog')).toBeNull()
      await settle()
      expect(writes()).toHaveLength(1)
      expect(userReplyIn(written()[0])).toBe('ACCEPTED')
      expect(screen.getByText('2 yes, 1 waiting')).toBeInTheDocument()

      await closePreview()
      await waitFor(() => expect(answers()).toEqual([done('ACCEPTED')]))
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
        expect(replyButton('DECLINED')).toHaveAttribute('aria-pressed', 'true')
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
        expect(userReplyIn(written().slice(-1)[0], NEXT_WEEK)).toBe('ACCEPTED')
        await waitFor(() =>
          expect(replyButton('ACCEPTED')).toHaveAttribute(
            'aria-pressed',
            'true'
          )
        )
        expect(screen.queryByRole('dialog')).toBeNull()

        await closePreview()
        await waitFor(() => expect(answers()).toEqual([done('ACCEPTED')]))
      }
    )

    // The user is invited to two occurrences, not to the series, and replies
    // to the one of the card; the other keeps its own reply. CodeRabbit on
    // PR #2218: afterChoice('all') (the card shows the first occurrence),
    // then round 2, foundLookup (the card shows the second one, not the
    // first one found)
    it.each([
      ['the first one', NEXT_WEEK, IN_TWO_WEEKS],
      ['the second one', IN_TWO_WEEKS, NEXT_WEEK]
    ])(
      'records the reply for the occurrence of the card alone, not for the other occurrences they are invited to (card on %s)',
      async (_, cardStart, other) => {
        serve(
          calendarObject(
            { isSeries: true, user: null },
            { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION' },
            { recurrenceId: IN_TWO_WEEKS, user: 'NEEDS-ACTION' }
          )
        )
        openIntent()
        await answerHandshake({
          uid: EVENT_UID,
          partstat: 'ACCEPTED',
          expected: { ...CARD, start: cardStart }
        })

        await findPreview()
        await waitFor(() => expect(written().length).toBeGreaterThan(0))
        await settle()
        const last = written().slice(-1)[0]
        expect(userReplyIn(last, cardStart)).toBe('ACCEPTED')
        expect(userReplyIn(last, other)).toBe('NEEDS-ACTION')

        await closePreview()
        await waitFor(() => expect(answers()).toEqual([done('ACCEPTED')]))
      }
    )

    // CodeRabbit on PR #2218 (round 3, cardCandidates): the event is read
    // again right before the reply is written; the occurrence of the card,
    // as the server holds it then, decides, not the one the lookup loaded.
    // Round 4: nor when the organizer took the user out of it, or cancelled
    // it or the whole series
    const occurrence = calendarObject(
      { isSeries: true, user: null },
      { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION' }
    )
    it.each([
      [
        'its organizer renamed that occurrence',
        occurrence,
        calendarObject(
          { isSeries: true, user: null },
          { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION', title: 'Pizza' }
        ),
        NEXT_WEEK
      ],
      [
        'that occurrence is no longer there',
        occurrence,
        calendarObject({ isSeries: true, user: null }),
        NEXT_WEEK
      ],
      [
        'its organizer took the user out of that occurrence',
        occurrence,
        calendarObject(
          { isSeries: true, user: null },
          { recurrenceId: NEXT_WEEK, user: null }
        ),
        NEXT_WEEK
      ],
      [
        'its organizer cancelled that occurrence',
        occurrence,
        calendarObject(
          { isSeries: true, user: null },
          { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION', status: 'CANCELLED' }
        ),
        NEXT_WEEK
      ],
      [
        'its organizer cancelled the series of that occurrence',
        occurrence,
        calendarObject(
          { isSeries: true, user: null, status: 'CANCELLED' },
          { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION' }
        ),
        NEXT_WEEK
      ],
      [
        'its organizer cancelled the series the card shows',
        calendarObject({ isSeries: true }),
        calendarObject({ isSeries: true, status: 'CANCELLED' }),
        CARD.start
      ]
    ])(
      'writes no reply, and says it was not sent, when between the lookup and the write %s',
      async (_, before, now, start) => {
        serve(before)
        // The lookup finds the event of the card; the read before the
        // write gets the event as it is now
        ;(fetchEventJCal as Mock).mockImplementation(async () =>
          structuredClone(now)
        )
        openIntent()
        await answerHandshake({
          uid: EVENT_UID,
          partstat: 'ACCEPTED',
          expected: { ...CARD, start }
        })

        await screen.findByRole(
          'button',
          { name: t('eventPreview.ACCEPTED') },
          { timeout: 10000 }
        )
        await settle()
        expect(writes()).toEqual([])
        expect(replyButton('ACCEPTED')).toHaveAttribute('aria-pressed', 'false')
        expect(screen.getByText(NOTICE)).toBeVisible()
      }
    )

    // Rule of the orchestrator, 2026-11-27 (case 4): the card shows the start
    // of the master, which does not invite the user, and several occurrences
    // do; which one is meant is unknown, so the user replies by hand
    it('writes no reply, and shows the preview with no reply chosen, when the card shows the start of the series and the user is invited to several occurrences', async () => {
      serve(
        calendarObject(
          { isSeries: true, user: null },
          { recurrenceId: NEXT_WEEK, user: 'NEEDS-ACTION' },
          { recurrenceId: IN_TWO_WEEKS, user: 'NEEDS-ACTION' }
        )
      )
      openIntent()
      await answerHandshake({
        uid: EVENT_UID,
        partstat: 'ACCEPTED',
        expected: CARD
      })

      await findPreview()
      await settle()
      expect(writes()).toEqual([])
      for (const reply of ['ACCEPTED', 'DECLINED', 'TENTATIVE'] as const) {
        expect(replyButton(reply)).toHaveAttribute('aria-pressed', 'false')
      }
    })

    // CodeRabbit on PR #2218 (foundLookup): the organizer cancelled the
    // occurrence the user is invited to; the series goes on without them
    it.each([
      ['without a reply asked', { uid: EVENT_UID }],
      [
        'with a reply asked',
        {
          uid: EVENT_UID,
          partstat: 'ACCEPTED',
          expected: { ...CARD, start: NEXT_WEEK }
        }
      ]
    ])(
      'says the event was cancelled, writes nothing, then cancels the intent, when that occurrence is cancelled (%s)',
      async (_, data) => {
        serve(
          calendarObject(
            { isSeries: true, user: null },
            {
              recurrenceId: NEXT_WEEK,
              user: 'NEEDS-ACTION',
              status: 'CANCELLED'
            }
          )
        )
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
        const close = screen.queryByRole('button', { name: t('actions.close') })
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
        const close = screen.queryByRole('button', { name: t('actions.close') })
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
        href: `/calendars/someone-else/someone-else/${EVENT_UID}.ics`
      })
      openIntent()
      await answerHandshake({ uid: EVENT_UID })

      await findMessage('failed')
      await waitFor(() => expect(sentOfType('error')).toHaveLength(1))
      expect(answers()).toEqual(sentOfType('error'))
      expect(writes()).toEqual([])
    })
  })
})
