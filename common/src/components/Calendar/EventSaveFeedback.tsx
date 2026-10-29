import { useEventSaveFeedback } from './hooks/useEventSaveFeedback'

// Keep notification updates outside the controller: rerendering FullCalendar
// between pointer-up and its deferred drop callback interrupts the gesture.
export function EventSaveFeedback({
  timezone,
  displayedPeriod
}: {
  timezone: string
  displayedPeriod: { start: Date; end: Date } | null
}): JSX.Element | null {
  return useEventSaveFeedback(timezone, displayedPeriod)
}
