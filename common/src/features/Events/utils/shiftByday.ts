const ICS_WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const BYDAY_PATTERN = /^([+-]?\d*)(SU|MO|TU|WE|TH|FR|SA)$/

function shiftWeekday(byday: string, days: number): string {
  const match = BYDAY_PATTERN.exec(byday.toUpperCase())
  if (!match) return byday
  const [, ordinal, weekday] = match
  const index = ICS_WEEKDAYS.indexOf(weekday)
  const shifted = ICS_WEEKDAYS[(((index + days) % 7) + 7) % 7]
  return `${ordinal}${shifted}`
}

/**
 * Moving a whole series by some days moves each of its occurrences, so the
 * weekdays the rule names in BYDAY have to move by the same number of days,
 * keeping their ordinal ("1MO" becomes "1TU"), or the shifted DTSTART would
 * be the only occurrence landing on the new weekday.
 */
export function shiftByday<T extends string[] | null | undefined>(
  byday: T,
  days: number
): T {
  if (!byday?.length || days % 7 === 0) return byday
  return byday.map(value => shiftWeekday(value, days)) as T
}
