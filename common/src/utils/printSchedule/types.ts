import { Dayjs } from 'dayjs'

/** One printed page corresponds to one period at the chosen scale. */
export type PrintScale = 'day' | 'week' | 'month'

/**
 * A calendar event normalized for printing: timezone already resolved, so
 * `start`/`end` are wall-clock instants in the user's timezone.
 */
export interface PrintEvent {
  uid: string
  title: string
  start: Dayjs
  end: Dayjs
  allDay: boolean
  location?: string
  color?: string
}

/** A single page of the printed schedule (`[start, end)` half-open range). */
export interface PrintPeriod {
  scale: PrintScale
  start: Dayjs
  end: Dayjs
  label: string
}

/** Human-readable strings injected into the standalone print document. */
export interface PrintLabels {
  documentTitle: string
  allDay: string
  noTitle: string
  weekPrefix: string
}

/** Calendar identity shown as a subtitle on every printed page. */
export interface PrintHeading {
  calendarName: string
  ownerName?: string
}
