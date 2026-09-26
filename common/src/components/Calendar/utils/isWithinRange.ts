/**
 * Whether an instant falls within a range of the grid, its end being exclusive
 * as FullCalendar hands it over.
 *
 * Compared as instants on purpose: a calendar week (`dayjs().isSame(_, 'week')`)
 * follows the locale of dayjs, whose weeks start on Sunday, whereas the grid
 * starts them on Monday -- which on every Sunday put today out of its own week.
 */
export const isWithinRange = (date: Date, start: Date, end: Date): boolean =>
  date.getTime() >= start.getTime() && date.getTime() < end.getTime()
