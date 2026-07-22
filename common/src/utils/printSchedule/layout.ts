import { PrintEvent } from './types'

export interface PositionedEvent {
  event: PrintEvent
  /** 0-based column the event occupies within its overlap cluster. */
  column: number
  /** Total number of columns the cluster is split into. */
  columns: number
}

/**
 * Assigns side-by-side columns to overlapping timed events using a greedy
 * sweep. Events are grouped into clusters of transitive overlap; within each
 * cluster every event gets the leftmost free column, and all cluster members
 * share the cluster's column count so they render at equal width.
 */
export const layoutTimedEvents = (events: PrintEvent[]): PositionedEvent[] => {
  const sorted = [...events].sort(
    (a, b) => a.start.valueOf() - b.start.valueOf() || a.end.valueOf() - b.end.valueOf()
  )

  const positioned: PositionedEvent[] = []
  let cluster: PrintEvent[] = []
  let clusterEnd = -Infinity

  const flushCluster = (): void => {
    if (cluster.length === 0) return

    const columnEnds: number[] = []
    const assignments = cluster.map(event => {
      let column = columnEnds.findIndex(end => event.start.valueOf() >= end)
      if (column === -1) {
        column = columnEnds.length
      }
      columnEnds[column] = event.end.valueOf()
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
    if (cluster.length > 0 && event.start.valueOf() >= clusterEnd) {
      flushCluster()
    }
    cluster.push(event)
    clusterEnd = Math.max(clusterEnd, event.end.valueOf())
  })
  flushCluster()

  return positioned
}
