import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { SearchEventResult } from './types/SearchEventResult'

/**
 * The store key of the event a search result previews. A series whose
 * occurrences the grid already loaded is only stored under the keys of those
 * occurrences (`<uid>/<instant>`), never under its plain uid (see the getEvent
 * reducer): the preview then shows the occurrence starting with the result,
 * or else the first loaded one (#2204).
 */
export function previewEventIdOf(
  calendar: Calendar | undefined,
  eventData: SearchEventResult
): string | undefined {
  const events = calendar?.events
  const uid = eventData.data.uid
  if (!events) return undefined
  if (events[uid]) return uid
  const occurrenceKeys = Object.keys(events)
    .filter(key => extractEventBaseUuid(key) === uid)
    .sort((a, b) => startOf(events[a]) - startOf(events[b]))
  const resultStart = new Date(eventData.data.start).getTime()
  return (
    occurrenceKeys.find(key => startOf(events[key]) === resultStart) ??
    occurrenceKeys[0]
  )
}

const startOf = (event: CalendarEvent | undefined): number =>
  event?.start ? new Date(event.start).getTime() : Number.POSITIVE_INFINITY
