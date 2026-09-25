// The date shown by the calendar grid survives a page reload (F5) so the user
// lands back on the period they were looking at. Session scoped: a new tab
// still opens on today. A date in the past is stale: the grid then goes back
// to today rather than to an outdated period.
const DISPLAYED_DATE_KEY = 'displayedDate'

export function getDisplayedDate(): Date {
  try {
    const stored = sessionStorage.getItem(DISPLAYED_DATE_KEY)
    const date = stored ? new Date(stored) : new Date()
    return isNaN(date.getTime()) || isBeforeToday(date) ? new Date() : date
  } catch {
    return new Date()
  }
}

function isBeforeToday(date: Date): boolean {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return date < startOfToday
}

export function setDisplayedDate(date: Date): void {
  try {
    sessionStorage.setItem(DISPLAYED_DATE_KEY, date.toISOString())
  } catch {
    // Ignore sessionStorage errors
  }
}
