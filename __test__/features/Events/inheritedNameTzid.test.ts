import { VCalComponent } from '@common/features/Calendars/types/CalendarData'
import {
  recurrenceInstant,
  sameRecurrence
} from '@common/features/Events/transformers/recurrenceInstant'
import { makeSeriesVtimezones } from '@common/features/Events/transformers/seriesVtimezones'
import { formatDateTimeToICal } from '@common/features/Events/utils/formatDateToICal'
import { knownZone, parseMoment } from '@common/features/Events/utils/jCalUtils'
import { isMomentZone, resolveTimezone } from '@common/utils/timezone'

// moment-timezone keeps its zones in plain objects: it throws a TypeError on
// an inherited name, and a received TZID can be any string. See #1888.
describe.each(['constructor', '__proto__'])('a stored TZID %s', tzid => {
  it('is not a moment zone', () => {
    expect(isMomentZone(tzid)).toBe(false)
  })

  it('resolves to itself', () => {
    expect(resolveTimezone(tzid)).toBe(tzid)
  })

  it('falls back to the series zone', () => {
    expect(knownZone(tzid, 'Europe/Paris')).toBe('Europe/Paris')
    expect(
      parseMoment(
        ['dtend', { tzid }, 'date-time', '2025-03-24T12:00:00'],
        'Europe/Paris'
      )?.toISOString()
    ).toBe('2025-03-24T11:00:00.000Z')
  })

  it('does not break the occurrence matching', () => {
    expect(() =>
      sameRecurrence(
        { value: '2025-03-24T09:00:00', tzid },
        { value: '2025-03-24T08:00:00Z' },
        'Europe/Paris'
      )
    ).not.toThrow()
    expect(() => recurrenceInstant('2025-03-24T09:00:00', tzid)).not.toThrow()
  })

  it('does not break the date-time formatting', () => {
    expect(() =>
      formatDateTimeToICal(new Date('2025-03-24T08:00:00Z'), tzid)
    ).not.toThrow()
  })

  it('gets no VTIMEZONE from the known zones', () => {
    const vevent: VCalComponent = [
      'vevent',
      [
        ['uid', {}, 'text', 'series-1'],
        ['dtstart', { tzid }, 'date-time', '2025-03-24T11:00:00']
      ],
      []
    ]
    const fallback: VCalComponent = ['vtimezone', [], []]

    expect(makeSeriesVtimezones([vevent], [], () => fallback)).toEqual([
      fallback
    ])
  })
})

describe('isMomentZone', () => {
  it('accepts a zone known to moment-timezone', () => {
    expect(isMomentZone('Europe/Paris')).toBe(true)
  })

  it('rejects unknown, missing and non string values', () => {
    expect(isMomentZone('Mars/Phobos')).toBe(false)
    expect(isMomentZone(undefined)).toBe(false)
    expect(isMomentZone('')).toBe(false)
    expect(isMomentZone(12345)).toBe(false)
  })
})
