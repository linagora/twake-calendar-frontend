import { useMemo } from 'react'
import { isListView } from '@common/components/Calendar/utils/constants'
import { EventApi, EventInput } from '@fullcalendar/core'
import { sortEventsByDateTime } from '@common/components/Calendar/utils/calendarUtils'

export const useFindUpcommingEvent = (
  events: EventInput[],
  currentView: string
): string | undefined => {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) =>
      sortEventsByDateTime(a as EventApi, b as EventApi)
    )
  }, [events])

  return useMemo(() => {
    if (!isListView(currentView)) return undefined

    const now = new Date().getTime()
    let upcommingEventId: string | undefined = undefined
    let minDiff = Infinity

    for (const event of sortedEvents) {
      if (!event.start || !event.uid) continue
      const start = new Date(event.start as string)

      const diff = start.getTime() - now

      if (diff >= 0 && diff < minDiff) {
        minDiff = diff
        upcommingEventId = event.uid as string
      }
    }
    return upcommingEventId
  }, [sortedEvents, currentView])
}
