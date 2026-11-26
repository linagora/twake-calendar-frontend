// First: the mocks of the harness must be in place when the app loads
import {
  EVENT_UID,
  NEXT_WEEK,
  answerHandshake,
  answers,
  calendarObject,
  closeButton,
  done,
  fakeTodayBeforeTheMeetings,
  findPreview,
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
const openIntent = (): void => {
  window.history.replaceState(null, '', '/intents?intent=intent-1')
  render(
    <Provider store={signedInStore()}>
      <IntentsApp />
    </Provider>
  )
}

describe('a close of the event Twake Chat opens, while the reply the user clicked is in flight', () => {
  beforeEach(resetServers)
  fakeTodayBeforeTheMeetings()

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
    await user.click(closeButton())
    await settle()
    // Not the former reply while the new one is in flight
    expect(answers()).toEqual([])

    act(() => confirm(new Response(null, { status: 204 })))

    await waitFor(() => expect(answers()).toEqual([done('DECLINED')]))
    await settle()
    expect(answers()).toHaveLength(1)
  })

  it('gives the client the reply clicked on an occurrence once the event, loaded again, shows it', async () => {
    serve(calendarObject({ recurrenceId: NEXT_WEEK, user: 'TENTATIVE' }))
    const reloads = holdReloads()
    const user = userEvent.setup()
    openIntent()
    await answerHandshake({ uid: EVENT_UID })
    await findPreview()

    await user.click(replyButton('DECLINED'))
    await waitFor(() => expect(written()).toHaveLength(1))
    expect(userReplyIn(written()[0], NEXT_WEEK)).toBe('DECLINED')
    await waitFor(() => expect(fetchEventByUid).toHaveBeenCalledTimes(2))
    await user.click(closeButton())
    await settle()
    // Not the former reply while the event is loaded again
    expect(answers()).toEqual([])

    act(() => reloads.pending[0]())

    await waitFor(() => expect(answers()).toEqual([done('DECLINED')]))
    await settle()
    expect(answers()).toHaveLength(1)
  })

  // CodeRabbit on PR #2218 (useReplyToWholeSeries): the server confirmed the
  // reply; the reload after it is only there to show it
  it('gives the client the reply clicked on an occurrence once the server confirmed it, even when the event cannot be loaded again', async () => {
    serve(calendarObject({ recurrenceId: NEXT_WEEK, user: 'TENTATIVE' }))
    const reloads = holdReloads()
    reloads.fail(
      Object.assign(new Error('Server down'), { response: { status: 500 } })
    )
    const user = userEvent.setup()
    openIntent()
    await answerHandshake({ uid: EVENT_UID })
    await findPreview()

    await user.click(replyButton('DECLINED'))
    await waitFor(() => expect(written()).toHaveLength(1))
    await waitFor(() => expect(reloads.pending).toHaveLength(1))
    await user.click(closeButton())
    act(() => reloads.pending[0]())

    await waitFor(() => expect(answers()).toEqual([done('DECLINED')]))
    await settle()
    expect(answers()).toHaveLength(1)
  })

  // CodeRabbit on PR #2218 (useCloseOnceAnswered): two replies clicked one
  // after the other on an occurrence, each followed by its reload
  it('waits for every reload of the occurrence before it answers, and gives the last reply clicked', async () => {
    serve(calendarObject({ recurrenceId: NEXT_WEEK, user: 'TENTATIVE' }))
    const reloads = holdReloads()
    const user = userEvent.setup()
    openIntent()
    await answerHandshake({ uid: EVENT_UID })
    await findPreview()

    await user.click(replyButton('DECLINED'))
    await waitFor(() => expect(reloads.pending).toHaveLength(1))
    await waitFor(() => expect(replyButton('ACCEPTED')).toBeEnabled())
    await user.click(replyButton('ACCEPTED'))
    await waitFor(() => expect(reloads.pending).toHaveLength(2))
    expect(userReplyIn(written().slice(-1)[0], NEXT_WEEK)).toBe('ACCEPTED')
    await user.click(closeButton())

    act(() => reloads.pending[0]())
    await settle()
    // The second reload is still on its way
    expect(answers()).toEqual([])

    act(() => reloads.pending[1]())

    await waitFor(() => expect(answers()).toEqual([done('ACCEPTED')]))
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
      await user.click(closeButton())
      await settle()
      expect(answers()).toEqual([])

      act(() => refuse(new Response(null, { status: 500 })))

      await waitFor(() => expect(answers()).toEqual([done('TENTATIVE')]))
      await settle()
      expect(answers()).toHaveLength(1)
    }
  )

  // Chat's close button is hidden (hideCross): the close of the page is the
  // only way out, so it waits for the server 10 s at most
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

      await waitFor(() => expect(answers()).toEqual([done('TENTATIVE')]))
      await settle()
      expect(answers()).toHaveLength(1)
    }
  )
})
