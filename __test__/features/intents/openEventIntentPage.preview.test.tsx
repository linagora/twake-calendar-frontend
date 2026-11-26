// First: the mocks of the harness must be in place when the app loads
import {
  ASKED,
  CARD,
  CHAT,
  answerHandshake,
  answers,
  closeButton,
  done,
  findMessage,
  findPreview,
  found,
  repliesWritten,
  replyButton,
  resetServers,
  sentOfType,
  settle,
  signedInStore,
  storedEvent,
  t,
  USER_ID,
  EVENT_UID
} from './openEventIntentHarness'
import type { Mock } from 'vitest'
import { fetchEventByUid } from '@common/features/Calendars/CalendarDAO'
import { fetchEventJCal, putEvent } from '@common/features/Events/EventDao'
import { IntentsApp } from '@private/IntentsApp'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import {
  askedHeights,
  askedSizes,
  installLayout,
  resizeContentTo,
  uninstallLayout
} from './layoutResizeObserver'

// The preview Twake Chat opens, what the user reads when it cannot show the
// event, and the reply the user gives in it (openEventIntentHarness.ts)
const openIntent = (store = signedInStore()): void => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  render(
    <Provider store={store}>
      <IntentsApp />
    </Provider>
  )
}

describe('the event Twake Chat opens with a cozy-stack intent', () => {
  beforeEach(resetServers)

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
      expect(closeButton()).toBeVisible()
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
      await user.click(closeButton())

      await waitFor(() => expect(answers()).toEqual([done('DECLINED')]))
    })

    it('gives the client the reply the user already gave, when they close it without a new one', async () => {
      ;(fetchEventByUid as Mock).mockResolvedValue(found('ACCEPTED'))
      ;(fetchEventJCal as Mock).mockResolvedValue(storedEvent('ACCEPTED'))
      const user = userEvent.setup()
      openIntent()
      await answerHandshake({ uid: EVENT_UID })
      await findPreview()

      await user.click(closeButton())

      await waitFor(() => expect(answers()).toEqual([done('ACCEPTED')]))
      expect(putEvent).not.toHaveBeenCalled()
    })

    it('gives the client no reply when the user closes it without replying', async () => {
      const user = userEvent.setup()
      openIntent()
      await answerHandshake({ uid: EVENT_UID })
      await findPreview()

      await user.click(closeButton())

      await waitFor(() => expect(answers()).toEqual([done(null)]))
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

    // CodeRabbit on PR #2218 (IntentPage, hasLoadFailed): the 404 of the
    // lookup is written as the error of the calendars, which the page took
    // for calendars it could not load when the user has none to write in
    it('says the event cannot be found, and gives the client null, for a user with no calendar of their own', async () => {
      const user = userEvent.setup()
      openIntent(signedInStore({}))
      await answerHandshake({ uid: 'deleted-meeting' })

      expect(
        await screen.findByText(t('error.eventNotFound'), undefined, {
          timeout: 10000
        })
      ).toBeVisible()
      expect(
        screen.queryByRole('heading', { name: t('intents.failed.title') })
      ).toBeNull()
      const close = screen.queryByRole('button', { name: t('actions.close') })
      if (answers().length === 0 && close) await user.click(close)

      await waitFor(() =>
        expect(answers()).toEqual([[{ type: 'intent-intent-1:cancel' }, CHAT]])
      )
      expect(sentOfType('error')).toEqual([])
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
      // The card sends an ISO 8601 instant: a date the browser reads in
      // another format is no start of the card (CodeRabbit on PR #2218)
      [
        'an expected start written as an e-mail date (RFC 2822), not ISO 8601',
        {
          ...ASKED,
          expected: { ...CARD, start: 'Mon, 23 Nov 2026 10:00:00 GMT' }
        }
      ],
      [
        'an expected start written in words, not ISO 8601',
        {
          ...ASKED,
          expected: { ...CARD, start: 'November 23, 2026 10:00 UTC' }
        }
      ],
      [
        'an expected without a start',
        { ...ASKED, expected: { title: CARD.title } }
      ]
    ])(
      'fails an event asked with data of another shape, before looking it up: %s',
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
        expect(fetchEventByUid).not.toHaveBeenCalled()
        expect(putEvent).not.toHaveBeenCalled()
      }
    )
  })
})
