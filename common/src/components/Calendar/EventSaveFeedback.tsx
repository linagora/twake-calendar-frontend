import type { MutableRefObject } from 'react'
import type { CalendarApi } from '@fullcalendar/core'
import type { SavedEvent } from '@common/features/Events/eventSaveFeedbackSlice'
import { useEventSaveFeedback } from './hooks/useEventSaveFeedback'

// Keep notification updates outside the controller: rerendering FullCalendar
// between pointer-up and its deferred drop callback interrupts the gesture.
export function EventSaveFeedback({
  calendarRef,
  timezone,
  showEventPreview,
  displayedPeriod
}: {
  calendarRef: MutableRefObject<CalendarApi | null>
  timezone: string
  showEventPreview: (event: SavedEvent, date: Date) => void
  displayedPeriod: { start: Date; end: Date } | null
}): JSX.Element | null {
  return useEventSaveFeedback(
    calendarRef,
    timezone,
    showEventPreview,
    displayedPeriod
  )
}
