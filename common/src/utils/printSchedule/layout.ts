import { PrintEvent } from './types'

export interface PositionedEvent {
  event: PrintEvent
  /** 0-based column the event occupies within its overlap cluster. */
  column: number
  /** Total number of columns the cluster is split into. */
  columns: number
}

/** Where an event lies on the axis the columns are computed on. */
export interface TimeSpan {
  start: number
  end: number
}

const instantSpan = (event: PrintEvent): TimeSpan => ({
  start: event.start.valueOf(),
  end: event.end.valueOf()
})

/**
 * Assigns side-by-side columns to overlapping timed events using a greedy
 * sweep. Events are grouped into clusters of transitive overlap; within each
 * cluster every event gets the leftmost free column, and all cluster members
 * share the cluster's column count so they render at equal width.
 *
 * Overlaps are computed on `spanOf`, the instants by default. A grid passes
 * where it draws the events: on the day the clocks go back, two events of the
 * repeated hour are an hour apart but drawn at the same place.
 */
export const layoutTimedEvents = (
  events: PrintEvent[],
  spanOf: (event: PrintEvent) => TimeSpan = instantSpan
): PositionedEvent[] => {
  const spans = new Map(events.map(event => [event, spanOf(event)]))
  const span = (event: PrintEvent): TimeSpan => spans.get(event) as TimeSpan
  const sorted = [...events].sort(
    (a, b) => span(a).start - span(b).start || span(a).end - span(b).end
  )

  const positioned: PositionedEvent[] = []
  let cluster: PrintEvent[] = []
  let clusterEnd = -Infinity

  const flushCluster = (): void => {
    if (cluster.length === 0) return

    const columnEnds: number[] = []
    const assignments = cluster.map(event => {
      let column = columnEnds.findIndex(end => span(event).start >= end)
      if (column === -1) {
        column = columnEnds.length
      }
      columnEnds[column] = span(event).end
      return { event, column }
    })

    const columns = columnEnds.length
    assignments.forEach(({ event, column }) =>
      positioned.push({ event, column, columns })
    )

    cluster = []
    clusterEnd = -Infinity
  }

  sorted.forEach(event => {
    if (cluster.length > 0 && span(event).start >= clusterEnd) {
      flushCluster()
    }
    cluster.push(event)
    clusterEnd = Math.max(clusterEnd, span(event).end)
  })
  flushCluster()

  return positioned
}
