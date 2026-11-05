import {
  RepetitionRule,
  VCalComponent
} from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { parseRepetitionRule } from '@common/features/Events/utils/parseCalendarEvent'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject, RepetitionOptions } from '@common/types/Repetition'
import ICAL from 'ical.js'

const masterOf = (rule: RepetitionRule, start: string, end: string) =>
  [
    'vevent',
    [
      ['uid', {}, 'text', 'series-1'],
      ['dtstart', { tzid: 'Europe/Paris' }, 'date-time', start],
      ['dtend', { tzid: 'Europe/Paris' }, 'date-time', end],
      ['rrule', {}, 'recur', rule],
      ['summary', {}, 'text', 'Series'],
      ['sequence', {}, 'integer', 1]
    ],
    []
  ] as VCalComponent

// The repetition the form holds for the stored rule, as resolveRepetition
// builds it, with the changes the user made
const formRepetition = (
  rule: RepetitionRule,
  changes: RepetitionOptions = {}
) => {
  const parsed = parseRepetitionRule(rule)
  return new RepetitionObject({
    ...parsed,
    interval: parsed.interval || 1,
    byday: parsed.byday || null,
    wkst: parsed.wkst || null,
    allday: false,
    timezone: 'Europe/Paris',
    ...changes
  })
}

const eventOf = (
  repetition: RepetitionObject,
  start: string,
  end: string
): CalendarEvent =>
  ({
    uid: 'series-1',
    title: 'Renamed',
    timezone: 'Europe/Paris',
    calId: 'user/cal',
    URL: '/calendars/user/cal/series-1.ics',
    start,
    end,
    allday: false,
    organizer: new userOrganiser({ cn: 'test', cal_address: 'test@test.com' }),
    attendee: [],
    repetition
  }) as unknown as CalendarEvent

const vevents = (jCal: VCalComponent) =>
  (jCal[2] ?? []).filter(([name]) => name === 'vevent')

const master = (jCal: VCalComponent) =>
  vevents(jCal).find(
    ([, props]) => !props.some(([k]) => k === 'recurrence-id')
  )!

const ruleOf = (jCal: VCalComponent) =>
  master(jCal)[1].find(([k]) => k === 'rrule')![3] as Record<string, unknown>

const occurrences = (jCal: VCalComponent): string[] => {
  const event = new ICAL.Event(
    new ICAL.Component(jCal as unknown as unknown[]).getFirstSubcomponent(
      'vevent'
    )!
  )
  const iterator = event.iterator()
  const result: string[] = []
  for (let next = iterator.next(); next; next = iterator.next()) {
    result.push(next.toString())
  }
  return result
}

describe('makeSeriesJCal keeps the rule parts the form does not model (#1899)', () => {
  const secondTuesday: RepetitionRule & Record<string, unknown> = {
    freq: 'MONTHLY',
    byday: 'TU',
    bysetpos: 2,
    count: 6
  }
  const outlookSeries = masterOf(
    secondTuesday,
    '2025-03-11T09:00:00',
    '2025-03-11T10:00:00'
  )
  const seriesStart = '2025-03-11T08:00:00.000Z'
  const seriesEnd = '2025-03-11T09:00:00.000Z'

  it('writes the stored rule back when only the title changes', () => {
    const jCal = makeSeriesJCal(
      [outlookSeries],
      eventOf(formRepetition(secondTuesday), seriesStart, seriesEnd),
      { removeOverrides: false }
    )

    expect(ruleOf(jCal)).toEqual(secondTuesday)
    expect(occurrences(jCal)).toEqual([
      '2025-03-11T09:00:00',
      '2025-04-08T09:00:00',
      '2025-05-13T09:00:00',
      '2025-06-10T09:00:00',
      '2025-07-08T09:00:00',
      '2025-08-12T09:00:00'
    ])
  })

  it('keeps BYSETPOS when the form changes the count', () => {
    const jCal = makeSeriesJCal(
      [outlookSeries],
      eventOf(
        formRepetition(secondTuesday, { occurrences: 3 }),
        seriesStart,
        seriesEnd
      ),
      { removeOverrides: true }
    )

    expect(ruleOf(jCal)).toEqual({
      freq: 'monthly',
      interval: 1,
      count: 3,
      byday: ['TU'],
      bysetpos: 2
    })
  })

  it('writes the form rule when the user picks another frequency', () => {
    const jCal = makeSeriesJCal(
      [outlookSeries],
      eventOf(
        formRepetition(secondTuesday, { freq: 'weekly' }),
        seriesStart,
        seriesEnd
      ),
      { removeOverrides: true }
    )

    expect(ruleOf(jCal)).toEqual({
      freq: 'weekly',
      interval: 1,
      count: 6,
      byday: ['TU']
    })
  })

  it('keeps BYMONTH and BYMONTHDAY of a yearly rule', () => {
    const yearly = { freq: 'YEARLY', bymonth: 3, bymonthday: 11 }
    const jCal = makeSeriesJCal(
      [masterOf(yearly, '2025-03-11T09:00:00', '2025-03-11T10:00:00')],
      eventOf(formRepetition(yearly), seriesStart, seriesEnd),
      { removeOverrides: false }
    )

    expect(ruleOf(jCal)).toEqual(yearly)
  })

  it('moves BYMONTHDAY along with the start day of the series', () => {
    const monthly = { freq: 'MONTHLY', bymonthday: 11 }
    const jCal = makeSeriesJCal(
      [masterOf(monthly, '2025-03-11T09:00:00', '2025-03-11T10:00:00')],
      eventOf(
        formRepetition(monthly),
        '2025-03-12T08:00:00.000Z',
        '2025-03-12T09:00:00.000Z'
      ),
      { removeOverrides: true }
    )

    expect(ruleOf(jCal)).toEqual({ freq: 'MONTHLY', bymonthday: 12 })
  })

  describe('BYHOUR and a new time of day', () => {
    const daily = { freq: 'DAILY', byhour: 17, count: 3 }
    const override = [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        [
          'recurrence-id',
          { tzid: 'Europe/Paris' },
          'date-time',
          '2025-03-12T17:30:00'
        ],
        [
          'dtstart',
          { tzid: 'Europe/Paris' },
          'date-time',
          '2025-03-12T17:30:00'
        ],
        ['dtend', { tzid: 'Europe/Paris' }, 'date-time', '2025-03-12T18:30:00'],
        ['summary', {}, 'text', 'Own title'],
        ['sequence', {}, 'integer', 1]
      ],
      []
    ] as VCalComponent
    const series = [
      masterOf(daily, '2025-03-11T17:30:00', '2025-03-11T18:30:00'),
      override
    ]

    const moveTo = (start: string, end: string) =>
      makeSeriesJCal(series, eventOf(formRepetition(daily), start, end), {
        removeOverrides: false,
        followTimeChange: true
      })

    const recurrenceIds = (jCal: VCalComponent) =>
      vevents(jCal)
        .flatMap(([, props]) => props)
        .filter(([k]) => k === 'recurrence-id')
        .map(([, , , value]) => value)

    it('keeps BYHOUR when the new time stays within that hour', () => {
      const jCal = moveTo(
        '2025-03-11T16:45:00.000Z',
        '2025-03-11T17:45:00.000Z'
      )

      expect(ruleOf(jCal)).toEqual(daily)
      expect(recurrenceIds(jCal)).toEqual(['2025-03-12T17:45:00'])
      expect(occurrences(jCal)).toContain('2025-03-12T17:45:00')
    })

    it('moves BYHOUR along with the time of day', () => {
      const jCal = moveTo(
        '2025-03-11T17:30:00.000Z',
        '2025-03-11T18:30:00.000Z'
      )

      expect(ruleOf(jCal)).toEqual({ ...daily, byhour: 18 })
      expect(recurrenceIds(jCal)).toEqual(['2025-03-12T18:30:00'])
      expect(occurrences(jCal)).toEqual([
        '2025-03-11T18:30:00',
        '2025-03-12T18:30:00',
        '2025-03-13T18:30:00'
      ])
    })
  })
})

describe('parseRepetitionRule count', () => {
  it.each(['/', '5DTEND', '', '1.5', '-2', 0])(
    'leaves out the count %j',
    count => {
      const rule = { freq: 'YEARLY', count } as unknown as RepetitionRule
      expect(parseRepetitionRule(rule).occurrences).toBeFalsy()
    }
  )

  it.each([
    [5, 5],
    ['5', 5]
  ])('reads the count %j as a number', (count, expected) => {
    const rule = { freq: 'YEARLY', count } as unknown as RepetitionRule
    expect(parseRepetitionRule(rule).occurrences).toBe(expected)
  })
})
