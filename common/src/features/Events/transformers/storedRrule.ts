import moment from 'moment-timezone'
import {
  RepetitionRule,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { normalizeRepetition } from '@common/features/Events/utils/normalizeRepetition'
import { parseRepetitionRule } from '@common/features/Events/utils/parseCalendarEvent'
import { RepetitionObject } from '@common/types/Repetition'

type RuleValues = Record<string, unknown>

// Parts of a rule the event form does not model: they are only known from the
// stored RRULE, and the rule built from the form never carries them
const UNMODELLED_PARTS = [
  'bysetpos',
  'bymonth',
  'bymonthday',
  'byyearday',
  'byweekno',
  'byhour',
  'byminute',
  'bysecond'
] as const

// Parts a time of day change moves, with the value range they cycle over
const TIME_PARTS = [
  { part: 'byhour', modulo: 24, read: (m: moment.Moment): number => m.hours() },
  {
    part: 'byminute',
    modulo: 60,
    read: (m: moment.Moment): number => m.minutes()
  },
  {
    part: 'bysecond',
    modulo: 60,
    read: (m: moment.Moment): number => m.seconds()
  }
] as const

// Parts that name the day of the series start, followed when it moves
const DAY_PARTS = [
  { part: 'bymonthday', read: (m: moment.Moment): number => m.date() },
  { part: 'bymonth', read: (m: moment.Moment): number => m.month() + 1 }
] as const

export interface SeriesStarts {
  oldStart: moment.Moment | null
  newStart: moment.Moment | null
}

const asList = (value: unknown): number[] =>
  (Array.isArray(value) ? value : [value]).map(Number)

const fromList = (original: unknown, list: number[]): unknown =>
  Array.isArray(original) ? list : list[0]

const lowerCaseKeys = (rule: RuleValues): RuleValues =>
  Object.fromEntries(
    Object.entries(rule).map(([key, value]) => [key.toLowerCase(), value])
  )

const sameFreq = (stored: RuleValues, edited: RuleValues): boolean =>
  String(stored.freq).toLowerCase() === String(edited.freq).toLowerCase()

// The form rule says nothing about the parts it does not model: it leaves the
// stored rule alone when it reads the same as the stored rule seen by the form
const formLeavesRuleAlone = (
  stored: RuleValues,
  repetition: RepetitionObject | undefined
): boolean => {
  const storedAsForm = parseRepetitionRule(stored as unknown as RepetitionRule)
  return (
    JSON.stringify(normalizeRepetition(storedAsForm)) ===
      JSON.stringify(normalizeRepetition(repetition)) &&
    (storedAsForm.wkst || null) === (repetition?.wkst || null)
  )
}

// A new time of day moves every time part by the same amount, even when the
// rule already lists the new value: the RECURRENCE-IDs, EXDATEs and RDATEs
// move by the whole shift, and the occurrences have to move along (#1949)
const followTimeOfDay = (
  rule: RuleValues,
  { oldStart, newStart }: SeriesStarts
): RuleValues =>
  TIME_PARTS.reduce((acc, { part, modulo, read }) => {
    if (acc[part] == null || !oldStart || !newStart) return acc
    const values = asList(acc[part])
    const delta = read(newStart) - read(oldStart)
    const moved = values.map(v => (((v + delta) % modulo) + modulo) % modulo)
    return { ...acc, [part]: fromList(acc[part], moved) }
  }, rule)

// A day part naming the old start day names the new one
const followStartDay = (
  rule: RuleValues,
  { oldStart, newStart }: SeriesStarts
): RuleValues =>
  DAY_PARTS.reduce((acc, { part, read }) => {
    if (acc[part] == null || !oldStart || !newStart) return acc
    const values = asList(acc[part])
    const namesOldStart = values.length === 1 && values[0] === read(oldStart)
    if (!namesOldStart) return acc
    return { ...acc, [part]: fromList(acc[part], [read(newStart)]) }
  }, rule)

const followStart = (rule: RuleValues, starts: SeriesStarts): RuleValues =>
  followStartDay(followTimeOfDay(rule, starts), starts)

const unmodelledParts = (stored: RuleValues): RuleValues =>
  Object.fromEntries(
    UNMODELLED_PARTS.filter(part => stored[part] != null).map(part => [
      part,
      stored[part]
    ])
  )

// The DTSTART written carries the series zone, while the stored UNTIL matched
// the stored DTSTART: a floating one is floating, against RFC 5545 once DTSTART
// has a TZID. The form UNTIL has the value type the written DTSTART asks for.
const untilOfForm = (stored: RuleValues, edited: RuleValues): RuleValues =>
  stored.until !== undefined && edited.until !== undefined
    ? { until: edited.until }
    : {}

const withValue = (
  [name, params, type]: VObjectProperty,
  value: RuleValues
): VObjectProperty => [name, params, type, value]

/**
 * The RRULE to write for a series edit. The form only models FREQ, INTERVAL,
 * COUNT, UNTIL, BYDAY and WKST: rebuilding the rule from it alone would drop
 * BYSETPOS, BYMONTH, BYHOUR... of a series written by another client, and
 * change its occurrences.
 * - the form left the rule alone: the stored rule is written back, with the
 *   UNTIL of the form, in the value type of the DTSTART written
 * - the form changed the rule but kept its frequency: the parts it does not
 *   model are kept on top of the form rule
 * - the form changed the frequency: the user picked another kind of rule
 * Kept parts naming the start time or day follow the series start.
 */
export const mergeStoredRrule = (
  storedRrule: VObjectProperty,
  formRrule: VObjectProperty | undefined,
  repetition: RepetitionObject | undefined,
  starts: SeriesStarts
): VObjectProperty => {
  if (!formRrule) return storedRrule
  const stored = lowerCaseKeys(storedRrule[3] as unknown as RuleValues)
  const edited = formRrule[3] as unknown as RuleValues

  if (formLeavesRuleAlone(stored, repetition)) {
    return withValue(storedRrule, {
      ...followStart(stored, starts),
      ...untilOfForm(stored, edited)
    })
  }
  if (!sameFreq(stored, edited)) return formRrule

  return withValue(formRrule, {
    ...edited,
    ...followStart(unmodelledParts(stored), starts)
  })
}
