import {
  calendarLabel,
  eventAccessibleLabel,
  ownAnswer
} from '@common/components/Event/utils/eventAccessibleLabel'
import { Calendar } from '@common/types/CalendarTypes'
import en from '@common/locales/en.json'

const lookup = (key: string): string =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      en
    ) as string

const t = (key: string, vars?: Record<string, string>): string =>
  Object.entries(vars ?? {}).reduce(
    (text, [k, v]) => text.replace(`%{${k}}`, v),
    lookup(key)
  )

describe('eventAccessibleLabel', () => {
  it('names a timed event with its day, time and calendar', () => {
    expect(
      eventAccessibleLabel({
        title: 'Weekly sync',
        start: new Date('2026-10-25T16:00:00Z'),
        end: new Date('2026-10-25T17:00:00Z'),
        allDay: false,
        calendarName: 'My calendar',
        timeZone: 'Europe/Paris',
        t
      })
    ).toBe('Weekly sync, Sunday, 25 October 2026, 17:00 – 18:00, My calendar')
  })

  it('says the answer the chip only draws', () => {
    const label = (partstat: string): string =>
      eventAccessibleLabel({
        title: 'Weekly sync',
        start: new Date('2026-10-25T16:00:00Z'),
        end: new Date('2026-10-25T17:00:00Z'),
        allDay: false,
        calendarName: 'My calendar',
        partstat,
        timeZone: 'UTC',
        t
      })

    expect(label('DECLINED')).toMatch(/, My calendar, You declined$/)
    expect(label('TENTATIVE')).toMatch(/, You tentatively accepted$/)
    expect(label('NEEDS-ACTION')).toMatch(/, Awaiting your response$/)
    expect(label('ACCEPTED')).toMatch(/, My calendar$/)
  })

  it('names a multi-day all-day event with its date range', () => {
    expect(
      eventAccessibleLabel({
        title: 'Offsite',
        start: new Date('2026-10-26T00:00:00Z'),
        end: new Date('2026-10-28T00:00:00Z'),
        allDay: true,
        calendarName: 'My calendar',
        timeZone: 'America/New_York',
        t
      })
    ).toBe(
      'Offsite, Monday, 26 October 2026 – Tuesday, 27 October 2026, All day, My calendar'
    )
  })

  it('names a one-day all-day event with its single day', () => {
    expect(
      eventAccessibleLabel({
        title: 'Holiday',
        start: new Date('2026-10-26T00:00:00Z'),
        end: new Date('2026-10-27T00:00:00Z'),
        allDay: true,
        calendarName: 'My calendar',
        timeZone: 'America/New_York',
        t
      })
    ).toBe('Holiday, Monday, 26 October 2026, All day, My calendar')
  })

  it('names an untitled event', () => {
    expect(
      eventAccessibleLabel({
        title: '',
        start: new Date('2026-10-25T16:00:00Z'),
        end: null,
        allDay: false,
        calendarName: 'My calendar',
        timeZone: 'UTC',
        t
      })
    ).toBe('Untitled, Sunday, 25 October 2026, 16:00, My calendar')
  })

  it('names a default calendar as the sidebar does, not "#default"', () => {
    const calendar = {
      id: 'alice-id/alice-id',
      name: '#default',
      owner: { firstname: 'alice', lastname: 'alice' }
    } as unknown as Calendar

    expect(calendarLabel(calendar, 'alice-id', t)).toBe(
      lookup('calendar.defaultPersonalCalendarName')
    )
    expect(calendarLabel(calendar, 'bob-id', t)).toBe(
      t('calendar.defaultCalendarName', { name: 'alice alice' })
    )
  })

  it("does not announce the answer of another user's calendar as the user's own (#2132)", () => {
    const calendar = {
      id: 'alice-id/alice-id',
      name: '#default'
    } as unknown as Calendar

    expect(ownAnswer(calendar, 'alice-id', 'NEEDS-ACTION')).toBe('NEEDS-ACTION')
    expect(ownAnswer(calendar, 'bob-id', 'NEEDS-ACTION')).toBeUndefined()
    expect(ownAnswer(calendar, undefined, 'DECLINED')).toBeUndefined()
    expect(ownAnswer(undefined, 'bob-id', 'DECLINED')).toBeUndefined()
  })
})
