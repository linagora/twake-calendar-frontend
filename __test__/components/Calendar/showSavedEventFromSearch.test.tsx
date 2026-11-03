import { useLayoutEffect } from 'react'
import type { CalendarApi } from '@fullcalendar/core'
import { act, fireEvent, screen } from '@testing-library/react'
import CalendarController from '@private/components/Calendar/CalendarController'
import { renderWithProviders } from '../../utils/Renderwithproviders'
import { setView } from '@common/features/Settings/SettingsSlice'
import { eventSaved } from '@common/features/Events/eventSaveFeedbackSlice'

const mockGotoDate = vi.fn()
const mockOpenPreview = vi.fn()
vi.mock('@common/components/Calendar/hooks/useOpenSavedEventPreview', () => ({
  useOpenSavedEventPreview: () => mockOpenPreview
}))
vi.mock('@common/features/Calendars/useCalendarLoader', () => ({
  useCalendarDataLoader: vi.fn()
}))
vi.mock('@common/features/Search/SearchResultsPage', () => ({
  default: () => <div>Search results</div>
}))
vi.mock('@common/components/Calendar/CalendarGrid', () => ({
  CalendarGrid: ({
    calendarRef
  }: {
    calendarRef: { current: CalendarApi | null }
  }) => {
    useLayoutEffect(() => {
      calendarRef.current = { gotoDate: mockGotoDate } as unknown as CalendarApi
      return () => {
        calendarRef.current = null
      }
    }, [calendarRef])
    return <div>Calendar grid</div>
  }
}))

it('mounts the calendar before navigating and opening a saved event from search', () => {
  const calendarRef = { current: null as CalendarApi | null }
  const { store } = renderWithProviders(
    <CalendarController
      calendarRef={calendarRef}
      currentDate={new Date()}
      currentView="timeGridWeek"
      setCurrentView={vi.fn()}
      selectedCalendars={['user/calendar']}
      setSelectedCalendars={vi.fn()}
      tempUsers={[]}
      setTempUsers={vi.fn()}
      selectedMiniDate={null}
      setSelectedMiniDate={vi.fn()}
      onViewChange={vi.fn()}
    />
  )
  act(() => {
    store.dispatch(setView('search'))
  })
  expect(screen.getByText('Search results')).toBeInTheDocument()
  expect(calendarRef.current).toBeNull()
  const saved = {
    uid: 'event',
    calId: 'user/calendar',
    start: '2027-06-15T10:00:00Z'
  }
  act(() => {
    store.dispatch(eventSaved(saved))
  })
  fireEvent.click(screen.getByRole('button', { name: 'actions.show' }))
  expect(screen.queryByText('Search results')).not.toBeInTheDocument()
  expect(screen.getByText('Calendar grid')).toBeInTheDocument()
  expect(mockGotoDate).toHaveBeenCalledWith(new Date(saved.start))
  expect(mockOpenPreview).toHaveBeenCalledWith({ ...saved, allday: undefined })
  expect(mockGotoDate.mock.invocationCallOrder[0]).toBeLessThan(
    mockOpenPreview.mock.invocationCallOrder[0]
  )
})
