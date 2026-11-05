import {
  RepetitionRule,
  VCalComponent
} from '@common/features/Calendars/types/CalendarData'
import { makeSeriesJCal } from '@common/features/Events/transformers/makeSeriesJCal'
import { mergeStoredRrule } from '@common/features/Events/transformers/storedRrule'
import { parseRepetitionRule } from '@common/features/Events/utils/parseCalendarEvent'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject, RepetitionOptions } from '@common/types/Repetition'
import ICAL from 'ical.js'
import moment from 'moment-timezone'

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

  describe('BYHOUR already listing the new hour (#1949)', () => {
    const twiceDaily = { freq: 'DAILY', count: 5, byhour: [17, 8] }
    const override = [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        [
          'recurrence-id',
          { tzid: 'Europe/Paris' },
          'date-time',
          '2025-03-12T17:00:00'
        ],
        [
          'dtstart',
          { tzid: 'Europe/Paris' },
          'date-time',
          '2025-03-12T17:00:00'
        ],
        ['dtend', { tzid: 'Europe/Paris' }, 'date-time', '2025-03-12T17:30:00'],
        ['summary', {}, 'text', 'Room B'],
        ['sequence', {}, 'integer', 1]
      ],
      []
    ] as VCalComponent
    const series = [
      masterOf(twiceDaily, '2025-03-11T16:00:00', '2025-03-11T16:30:00'),
      override
    ]

    it('moves BYHOUR by the same amount as the overrides', () => {
      const jCal = makeSeriesJCal(
        series,
        eventOf(
          formRepetition(twiceDaily),
          '2025-03-11T16:00:00.000Z',
          '2025-03-11T16:30:00.000Z'
        ),
        { removeOverrides: false, followTimeChange: true }
      )

      expect(ruleOf(jCal)).toEqual({ ...twiceDaily, byhour: [18, 9] })
      const recurrenceId = vevents(jCal)
        .flatMap(([, props]) => props)
        .find(([k]) => k === 'recurrence-id')![3]
      expect(recurrenceId).toEqual('2025-03-12T18:00:00')
      expect(occurrences(jCal)).toContain(recurrenceId)
    })

    it('moves the occurrences by the shift the user asked', () => {
      const morningAndNoon = { freq: 'DAILY', count: 3, byhour: [8, 12] }
      const stored = masterOf(
        morningAndNoon,
        '2025-03-11T09:00:00',
        '2025-03-11T10:00:00'
      )
      const jCal = makeSeriesJCal(
        [stored],
        eventOf(
          formRepetition(morningAndNoon),
          '2025-03-11T07:30:00.000Z',
          '2025-03-11T08:30:00.000Z'
        ),
        { removeOverrides: false, followTimeChange: true }
      )

      const thirtyMinutesEarlier = (time: string) =>
        moment(time).subtract(30, 'minutes').format('YYYY-MM-DDTHH:mm:ss')

      expect(ruleOf(jCal)).toEqual({ ...morningAndNoon, byhour: [7, 11] })
      expect(occurrences(jCal)).toEqual(
        occurrences(['vcalendar', [], [stored]] as VCalComponent).map(
          thirtyMinutesEarlier
        )
      )
    })
  })
})

describe('a floating UNTIL on a series edit (#1948)', () => {
  const weekly = { freq: 'WEEKLY', until: '2025-11-04T09:00:00' }

  it('writes a UTC UNTIL when the form leaves the rule alone', () => {
    const repetition = formRepetition(weekly)
    const start = moment.tz('2025-10-07T09:00:00', 'Europe/Paris')

    const [, , , rule] = mergeStoredRrule(
      ['rrule', {}, 'recur', weekly],
      repetition.asJcal(),
      repetition,
      { oldStart: start, newStart: start, zone: 'Europe/Paris' }
    )

    expect(rule).toEqual({ freq: 'WEEKLY', until: '20251104T080000Z' })
  })

  it('writes a UTC UNTIL next to the TZID DTSTART of a floating series', () => {
    const floatingSeries = [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        ['dtstart', {}, 'date-time', '2025-10-07T09:00:00'],
        ['dtend', {}, 'date-time', '2025-10-07T10:00:00'],
        ['rrule', {}, 'recur', weekly],
        ['summary', {}, 'text', 'Weekly sync']
      ],
      []
    ] as VCalComponent

    const jCal = makeSeriesJCal(
      [floatingSeries],
      eventOf(
        formRepetition(weekly),
        '2025-10-07T07:00:00.000Z',
        '2025-10-07T08:00:00.000Z'
      ),
      { removeOverrides: false }
    )

    expect(master(jCal)[1].find(([k]) => k === 'dtstart')).toEqual([
      'dtstart',
      { tzid: 'Europe/Paris' },
      'date-time',
      '2025-10-07T09:00:00'
    ])
    expect(ruleOf(jCal)).toEqual({ ...weekly, until: '20251104T080000Z' })
  })
})
