import type { CalendarApi, EventApi } from '@fullcalendar/react'
import {
  buildFirstRowByDay,
  DisplayedRange,
  getFirstRowByDay
} from '@common/components/Event/EventChip/scheduleFirstRows'

const TZ = 'Europe/Paris'

// The week of Monday 2026-11-23 in Paris
const WEEK: DisplayedRange = {
  start: new Date('2026-11-23T00:00:00+01:00'),
  end: new Date('2026-11-30T00:00:00+01:00')
}

const event = (
  instanceId: string,
  start: string,
  end?: string,
  priority?: number
): EventApi =>
  ({
    id: instanceId,
    start: new Date(start),
    end: end ? new Date(end) : null,
    extendedProps: { priority },
    _instance: { instanceId }
  }) as unknown as EventApi

const calendarOf = (
  events: EventApi[],
  currentStore: () => object | undefined,
  currentRange: () => DisplayedRange = () => WEEK
): { calendar: CalendarApi; getEvents: ReturnType<typeof vi.fn> } => {
  const getEvents = vi.fn(() => events)
  const calendar = {
    getEvents,
    getCurrentData: () => ({ eventStore: currentStore() }),
    get view() {
      const { start, end } = currentRange()
      return { activeStart: start, activeEnd: end }
    }
  } as unknown as CalendarApi
  return { calendar, getEvents }
}

describe('buildFirstRowByDay', () => {
  it('keeps the earliest event of each day', () => {
    const firstRows = buildFirstRowByDay(
      [
        event('late', '2026-11-23T15:00:00+01:00', '2026-11-23T16:00:00+01:00'),
        event(
          'early',
          '2026-11-23T09:00:00+01:00',
          '2026-11-23T10:00:00+01:00'
        ),
        event('next', '2026-11-24T11:00:00+01:00', '2026-11-24T12:00:00+01:00')
      ],
      TZ,
      WEEK
    )

    expect(firstRows.get('2026-11-23')).toBe('early')
    expect(firstRows.get('2026-11-24')).toBe('next')
  })

  it('breaks ties on the end, then on the priority, then on the order', () => {
    const start = '2026-11-23T09:00:00+01:00'
    expect(
      buildFirstRowByDay(
        [
          event('longer', start, '2026-11-23T11:00:00+01:00'),
          event('shorter', start, '2026-11-23T10:00:00+01:00')
        ],
        TZ,
        WEEK
      ).get('2026-11-23')
    ).toBe('shorter')
    expect(
      buildFirstRowByDay(
        [
          event('other', start, '2026-11-23T10:00:00+01:00', 1),
          event('personal', start, '2026-11-23T10:00:00+01:00', 0)
        ],
        TZ,
        WEEK
      ).get('2026-11-23')
    ).toBe('personal')
    expect(
      buildFirstRowByDay(
        [
          event('first', start, '2026-11-23T10:00:00+01:00'),
          event('second', start, '2026-11-23T10:00:00+01:00')
        ],
        TZ,
        WEEK
      ).get('2026-11-23')
    ).toBe('first')
  })

  it('registers an event spanning several days on each of them, end excluded', () => {
    const firstRows = buildFirstRowByDay(
      [
        event('span', '2026-11-23T00:00:00+01:00', '2026-11-26T00:00:00+01:00'),
        event('later', '2026-11-24T09:00:00+01:00', '2026-11-24T10:00:00+01:00')
      ],
      TZ,
      WEEK
    )

    expect(firstRows.get('2026-11-23')).toBe('span')
    expect(firstRows.get('2026-11-24')).toBe('span')
    expect(firstRows.get('2026-11-25')).toBe('span')
    expect(firstRows.has('2026-11-26')).toBe(false)
  })

  it('reads the days in the display time zone', () => {
    const firstRows = buildFirstRowByDay(
      [event('evening', '2026-11-23T23:30:00Z', '2026-11-23T23:45:00Z')],
      TZ,
      WEEK
    )

    expect([...firstRows.keys()]).toEqual(['2026-11-24'])
  })

  it('only registers the days of the displayed range (#2237)', () => {
    const firstRows = buildFirstRowByDay(
      [event('forever', '0001-01-01T00:00:00Z', '9999-12-31T00:00:00Z')],
      TZ,
      WEEK
    )

    expect([...firstRows.keys()]).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29'
    ])
  })

  it('ignores the events outside of the displayed range', () => {
    const firstRows = buildFirstRowByDay(
      [
        event(
          'before',
          '2026-11-22T09:00:00+01:00',
          '2026-11-22T10:00:00+01:00'
        ),
        event('after', '2026-11-30T00:00:00+01:00', '2026-11-30T01:00:00+01:00')
      ],
      TZ,
      WEEK
    )

    expect(firstRows.size).toBe(0)
  })
})

describe('getFirstRowByDay', () => {
  const events = [
    event('a', '2026-11-23T09:00:00+01:00', '2026-11-23T10:00:00+01:00')
  ]

  it('scans the events once per event store', () => {
    const store = {}
    const { calendar, getEvents } = calendarOf(events, () => store)

    getFirstRowByDay(calendar, TZ)
    getFirstRowByDay(calendar, TZ)

    expect(getEvents).toHaveBeenCalledTimes(1)
  })

  it('scans again when the time zone changes', () => {
    const store = {}
    const { calendar, getEvents } = calendarOf(events, () => store)

    getFirstRowByDay(calendar, TZ)
    getFirstRowByDay(calendar, 'America/New_York')

    expect(getEvents).toHaveBeenCalledTimes(2)
  })

  it('scans again when the event store changes', () => {
    const store = { current: {} }
    const { calendar, getEvents } = calendarOf(events, () => store.current)

    getFirstRowByDay(calendar, TZ)
    store.current = {}
    getFirstRowByDay(calendar, TZ)

    expect(getEvents).toHaveBeenCalledTimes(2)
  })

  it('scans again when the displayed range changes', () => {
    const store = {}
    const range = { current: WEEK }
    const { calendar, getEvents } = calendarOf(
      events,
      () => store,
      () => range.current
    )

    getFirstRowByDay(calendar, TZ)
    range.current = {
      start: new Date('2026-11-01T00:00:00+01:00'),
      end: new Date('2026-12-01T00:00:00+01:00')
    }
    getFirstRowByDay(calendar, TZ)

    expect(getEvents).toHaveBeenCalledTimes(2)
  })

  it('still answers without an event store', () => {
    const { calendar } = calendarOf(events, () => undefined)

    expect(getFirstRowByDay(calendar, TZ).get('2026-11-23')).toBe('a')
  })
})
