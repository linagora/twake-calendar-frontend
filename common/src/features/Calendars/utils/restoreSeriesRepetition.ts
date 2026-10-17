import { fetchEvent } from '@common/features/Events/EventDao'
import { parseFetchedEvent } from '@common/features/Events/transformers/parseFetchedEvent'
import { CalendarEvent } from '@common/types/EventsTypes'
import pMap from 'p-map'

const lacksSeriesRepetition = (event: CalendarEvent): boolean =>
  !!event.recurrenceId && event.repetition === undefined

/**
 * An expanded REPORT carries no RRULE: the occurrences of a series it returns
 * have no repetition. The series a refresh reads again have been read in full
 * before - typically the one whose preview is open, after an attendance answer
 * for a single occurrence (#1700) - and would lose their recurrence rule.
 *
 * Reads these series again rather than keeping the rule held in the store,
 * which the change being refreshed may have edited.
 */
export async function restoreSeriesRepetition(
  events: CalendarEvent[],
  previousEvents: CalendarEvent[],
  maxConcurrency: number
): Promise<CalendarEvent[]> {
  const previouslyReadUrls = new Set(
    previousEvents
      .filter(event => event.recurrenceId && event.repetition)
      .map(event => event.URL)
  )
  const seriesToRead = [
    ...new Set(
      events
        .filter(
          event =>
            lacksSeriesRepetition(event) && previouslyReadUrls.has(event.URL)
        )
        .map(event => event.URL)
    )
  ]
  if (seriesToRead.length === 0) {
    return events
  }

  const repetitions = new Map(
    await pMap(
      seriesToRead,
      async url => [url, await readSeriesRepetition(events, url)] as const,
      { concurrency: maxConcurrency }
    )
  )

  return events.map(event => {
    const repetition = repetitions.get(event.URL)
    return repetition && lacksSeriesRepetition(event)
      ? { ...event, repetition }
      : event
  })
}

async function readSeriesRepetition(
  events: CalendarEvent[],
  url: string
): Promise<CalendarEvent['repetition']> {
  const occurrence = events.find(event => event.URL === url) as CalendarEvent
  try {
    const master = parseFetchedEvent(
      occurrence,
      await fetchEvent(occurrence),
      true
    )
    return master.repetition
  } catch (err) {
    console.error('Failed to read the recurrence rule of', url, err)
    return undefined
  }
}
