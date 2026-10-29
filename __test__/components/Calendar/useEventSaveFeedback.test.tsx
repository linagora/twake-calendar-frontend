import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import eventSaveFeedbackReducer from '@common/features/Events/eventSaveFeedbackSlice'
import { act, render, screen } from '@testing-library/react'
import { useEventSaveFeedback } from '@common/components/Calendar/hooks/useEventSaveFeedback'
import {
  eventSaved,
  dismissEventSaveFeedback,
  type SavedEvent
} from '@common/features/Events/eventSaveFeedbackSlice'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string, options?: { date: string }) =>
      ({
        locale: 'en',
        'event.saved': 'Event saved',
        'event.savedFor': `Event saved for ${options?.date}`,
        'actions.show': 'Show'
      })[key]
  })
}))

let store = configureStore({
  reducer: { eventSaveFeedback: eventSaveFeedbackReducer }
})
const notifySaved = (event: SavedEvent): void => {
  store.dispatch(eventSaved(event))
}
const renderFeedback = (timezone?: string) =>
  render(
    <Provider store={store}>
      <Harness timezone={timezone} />
    </Provider>
  )

const saved: SavedEvent = {
  uid: 'event',
  calId: 'calendar',
  start: '2026-10-26T10:00:00Z'
}
function Harness({ timezone = 'UTC' }: { timezone?: string }) {
  const feedback = useEventSaveFeedback(timezone, {
    start: new Date('2026-10-19T00:00:00Z'),
    end: new Date('2026-10-26T00:00:00Z')
  })
  return feedback
}

describe('event save feedback', () => {
  beforeEach(() => {
    store = configureStore({
      reducer: { eventSaveFeedback: eventSaveFeedbackReducer }
    })
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-23T05:30:00Z'))
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('stores only serializable event identity and date fields', () => {
    const fullEvent = {
      ...saved,
      alarms: new Date(),
      title: 'Not needed for feedback'
    }
    store.dispatch(eventSaved(fullEvent))
    expect(store.getState().eventSaveFeedback.notice?.event).toEqual({
      ...saved,
      allday: undefined
    })
  })

  it('keeps a newer save when an older snackbar dismisses', () => {
    store.dispatch(eventSaved(saved))
    const previousId = store.getState().eventSaveFeedback.notice!.id
    store.dispatch(eventSaved(saved))
    store.dispatch(dismissEventSaveFeedback(previousId))
    expect(store.getState().eventSaveFeedback.notice?.id).toBe(previousId + 1)
  })

  it('confirms an in-period save for four seconds without Show', () => {
    renderFeedback()
    act(() => notifySaved({ ...saved, start: '2026-10-23T10:00:00Z' }))
    expect(screen.getByText('Event saved')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Show' })
    ).not.toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(screen.queryByText('Event saved')).not.toBeInTheDocument()
  })

  it('names an out-of-period event and keeps its confirmation for six seconds', () => {
    renderFeedback()
    act(() => notifySaved(saved))
    expect(
      screen.getByText('Event saved for Monday, October 26')
    ).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(
      screen.getByText('Event saved for Monday, October 26')
    ).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(
      screen.queryByText('Event saved for Monday, October 26')
    ).not.toBeInTheDocument()
  })

  it('restarts the timer for a repeated save of the same event', () => {
    renderFeedback()
    const event = { ...saved, start: '2026-10-23T10:00:00Z' }
    act(() => notifySaved(event))
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    act(() => notifySaved(event))
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(screen.getByText('Event saved')).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(screen.queryByText('Event saved')).not.toBeInTheDocument()
  })

  it('dismisses outside feedback after six seconds', () => {
    renderFeedback()
    act(() => notifySaved(saved))
    act(() => {
      jest.advanceTimersByTime(6000)
    })
    expect(
      screen.queryByText('Event saved for Monday, October 26')
    ).not.toBeInTheDocument()
  })

  it('formats timed and all-day dates in the grid timezone and adds a different year', () => {
    renderFeedback('America/Los_Angeles')
    act(() => notifySaved({ ...saved, start: '2027-01-01T01:00:00Z' }))
    expect(
      screen.getByText('Event saved for Thursday, December 31')
    ).toBeInTheDocument()
    act(() => notifySaved({ ...saved, start: '2027-01-01', allday: true }))
    expect(
      screen.getByText('Event saved for Friday, January 1, 2027')
    ).toBeInTheDocument()
  })
})
