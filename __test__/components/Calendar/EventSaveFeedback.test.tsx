import { act, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import type { CalendarApi } from '@fullcalendar/core'
import { EventSaveFeedback } from '@common/components/Calendar/EventSaveFeedback'
import feedbackReducer, {
  eventSaved
} from '@common/features/Events/eventSaveFeedbackSlice'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => (key === 'event.saved' ? 'Event saved' : key)
  })
}))

it('shows and expires save feedback without rerendering the sibling calendar', () => {
  jest.useFakeTimers()
  const store = configureStore({
    reducer: { eventSaveFeedback: feedbackReducer }
  })
  const Grid = jest.fn(() => <div>Calendar grid</div>)
  try {
    render(
      <Provider store={store}>
        <Grid />
        <EventSaveFeedback
          calendarRef={{ current: null as CalendarApi | null }}
          timezone="UTC"
          showEventPreview={jest.fn()}
          displayedPeriod={{
            start: new Date('2026-11-02T00:00:00Z'),
            end: new Date('2026-11-09T00:00:00Z')
          }}
        />
      </Provider>
    )
    const rendersBeforeSave = Grid.mock.calls.length
    act(() => {
      store.dispatch(
        eventSaved({
          uid: 'event',
          calId: 'calendar',
          start: '2026-11-04T09:00:00Z'
        })
      )
    })
    expect(screen.getByText('Event saved')).toBeInTheDocument()
    expect(Grid).toHaveBeenCalledTimes(rendersBeforeSave)
    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(screen.queryByText('Event saved')).not.toBeInTheDocument()
    expect(Grid).toHaveBeenCalledTimes(rendersBeforeSave)
  } finally {
    jest.useRealTimers()
  }
})
