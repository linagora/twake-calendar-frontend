// First: the mocks of the harness must be in place when the app loads
import {
  EVENT_UID,
  NEXT_WEEK,
  answerHandshake,
  answeredOnceWith,
  answers,
  calendarObject,
  closeButton,
  fakeTodayBeforeTheMeetings,
  findPreview,
  heldAnswer,
  holdReloads,
  replyButton,
  resetServers,
  serve,
  settle,
  signedInStore,
  userReplyIn,
  written
} from './openEventIntentHarness'
import { fetchEventByUid } from '@common/features/Calendars/CalendarDAO'
import { putEvent } from '@common/features/Events/EventDao'
import { IntentsApp } from '@private/IntentsApp'
import { act, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'

// A close of the preview while the reply the user clicked is on its way: the
// client removes the frame once it has its answer, which would abort that
// reply, so the page answers once the server did (openEventIntentHarness.ts)
const openPreview = async (): Promise<ReturnType<typeof userEvent.setup>> => {
  const user = userEvent.setup()
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  render(
    <Provider store={signedInStore()}>
      <IntentsApp />
    </Provider>
  )
  await answerHandshake({ uid: EVENT_UID })
  await findPreview()
  return user
}

const AN_EVENT = calendarObject({ user: 'TENTATIVE' })
const AN_OCCURRENCE = calendarObject({
  recurrenceId: NEXT_WEEK,
  user: 'TENTATIVE'
})

describe('a close of the event Twake Chat opens, while the reply the user clicked is in flight', () => {
  beforeEach(resetServers)
  fakeTodayBeforeTheMeetings()

  it('gives the client the reply being sent once the server confirmed it, never the former one', async () => {
    const server = heldAnswer()
    serve(calendarObject({ user: 'ACCEPTED' }), { answer: server.answer })
    const user = await openPreview()

    await user.click(replyButton('DECLINED'))
    await waitFor(() => expect(putEvent).toHaveBeenCalledTimes(1))
    await user.click(closeButton())
    await settle()
    // Not the former reply while the new one is in flight
    expect(answers()).toEqual([])

    act(() => server.respond(204))

    await answeredOnceWith('DECLINED')
  })

  it('gives the client the reply clicked on an occurrence once the event, loaded again, shows it', async () => {
    serve(AN_OCCURRENCE)
    const reloads = holdReloads()
    const user = await openPreview()

    await user.click(replyButton('DECLINED'))
    await waitFor(() => expect(written()).toHaveLength(1))
    expect(userReplyIn(written()[0], NEXT_WEEK)).toBe('DECLINED')
    await waitFor(() => expect(fetchEventByUid).toHaveBeenCalledTimes(2))
    await user.click(closeButton())
    await settle()
    // Not the former reply while the event is loaded again
    expect(answers()).toEqual([])

    act(() => reloads.pending[0]())

    await answeredOnceWith('DECLINED')
  })

  // CodeRabbit on PR #2218 (useReplyToWholeSeries): the server confirmed the
  // reply; the reload after it is only there to show it
  it('gives the client the reply clicked on an occurrence once the server confirmed it, even when the event cannot be loaded again', async () => {
    serve(AN_OCCURRENCE)
    const reloads = holdReloads()
    reloads.fail(
      Object.assign(new Error('Server down'), { response: { status: 500 } })
    )
    const user = await openPreview()

    await user.click(replyButton('DECLINED'))
    await waitFor(() => expect(written()).toHaveLength(1))
    await waitFor(() => expect(reloads.pending).toHaveLength(1))
    await user.click(closeButton())
    act(() => reloads.pending[0]())

    await answeredOnceWith('DECLINED')
  })

  // Two replies clicked one after the other on an occurrence, each followed
  // by its reload
  describe('two replies clicked on an occurrence', () => {
    const clickTwoReplies = async (): Promise<{
      user: ReturnType<typeof userEvent.setup>
      pending: (() => void)[]
    }> => {
      serve(AN_OCCURRENCE)
      const reloads = holdReloads()
      const user = await openPreview()
      await user.click(replyButton('DECLINED'))
      await waitFor(() => expect(reloads.pending).toHaveLength(1))
      await waitFor(() => expect(replyButton('ACCEPTED')).toBeEnabled())
      await user.click(replyButton('ACCEPTED'))
      await waitFor(() => expect(reloads.pending).toHaveLength(2))
      expect(userReplyIn(written().slice(-1)[0], NEXT_WEEK)).toBe('ACCEPTED')
      return { user, pending: reloads.pending }
    }

    // CodeRabbit on PR #2218 (useCloseOnceAnswered)
    it('waits for every reload of the occurrence before it answers, and gives the last reply clicked', async () => {
      const { user, pending } = await clickTwoReplies()
      await user.click(closeButton())

      act(() => pending[0]())
      await settle()
      // The second reload is still on its way
      expect(answers()).toEqual([])

      act(() => pending[1]())

      await answeredOnceWith('ACCEPTED')
    })

    // CodeRabbit on PR #2218 (round 2, getEventByUid): the server answers
    // the reload of the first reply, as it held the event then, last
    it('shows and gives the last reply clicked, when the reload of the first one comes back after the reload of the second', async () => {
      const { user, pending } = await clickTwoReplies()

      act(() => pending[1]())
      await settle()
      act(() => pending[0]())
      await settle()

      expect(replyButton('ACCEPTED')).toHaveAttribute('aria-pressed', 'true')
      await user.click(closeButton())
      await answeredOnceWith('ACCEPTED')
    })
  })

  it.each([
    ['an event', AN_EVENT],
    ['an occurrence', AN_OCCURRENCE]
  ])(
    'gives the client the former reply once the server refused the one clicked (%s)',
    async (_, stored) => {
      const server = heldAnswer()
      serve(stored, { answer: server.answer })
      const user = await openPreview()

      await user.click(replyButton('DECLINED'))
      await waitFor(() => expect(putEvent).toHaveBeenCalledTimes(1))
      await user.click(closeButton())
      await settle()
      expect(answers()).toEqual([])

      act(() => server.respond(500))

      await answeredOnceWith('TENTATIVE')
    }
  )

  // Chat's close button is hidden (hideCross): the close of the page is the
  // only way out, so it waits for the server 10 s at most
  it.each([
    ['an event', AN_EVENT],
    ['an occurrence', AN_OCCURRENCE]
  ])(
    'gives the client the former reply and closes, once the server has not answered the one clicked for 10 s (%s)',
    async (_, stored) => {
      // The reply is sent, and the server never answers it
      serve(stored, { answer: () => new Promise<Response>(() => {}) })
      const user = await openPreview()
      await user.click(replyButton('DECLINED'))
      await waitFor(() => expect(putEvent).toHaveBeenCalledTimes(1))
      // The clock of the time limit, from the close on: the rest of the page
      // runs as it would
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(new Date('2026-11-20T09:00:00Z'))

      await user.click(closeButton())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9_000)
      })
      // Still waiting for the server
      expect(answers()).toEqual([])

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })

      await answeredOnceWith('TENTATIVE')
    }
  )
})
