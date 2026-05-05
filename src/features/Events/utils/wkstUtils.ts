// ical.js parses WKST as a number (1=SU, 2=MO, ..., 7=SA). Map it back to the RFC 5545 weekday string.
export const WKST_NUM_TO_DAY: Record<number, string> = {
  1: 'SU',
  2: 'MO',
  3: 'TU',
  4: 'WE',
  5: 'TH',
  6: 'FR',
  7: 'SA'
}
