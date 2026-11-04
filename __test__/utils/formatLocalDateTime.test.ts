import moment from 'moment-timezone'
import {
  formatDateTimeInTimezone,
  formatLocalDateTime
} from '@common/components/Event/utils/dateTimeFormatters'
import { convertFormDateTimeToISO } from '@common/components/Event/utils/dateTimeHelpers'

describe('formatLocalDateTime', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('formats a date in the given time zone as YYYY-MM-DDTHH:mm', () => {
    expect(
      formatLocalDateTime(new Date('2026-10-06T23:00:00Z'), 'Europe/Paris')
    ).toBe('2026-10-07T01:00')
  })

  it('writes midnight as 00:00', () => {
    expect(
      formatLocalDateTime(new Date('2026-10-07T22:00:00Z'), 'Europe/Paris')
    ).toBe('2026-10-08T00:00')
  })

  it('does not depend on the en-CA pattern of the engine (Safari yields MM/DD/YYYY)', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'format', 'get').mockReturnValue(
      () => '10/07/2026, 01:00'
    )

    expect(
      formatLocalDateTime(new Date('2026-10-06T23:00:00Z'), 'Europe/Paris')
    ).toBe('2026-10-07T01:00')
  })

  it('returns an empty string for an invalid date', () => {
    expect(formatLocalDateTime(new Date('invalid'), 'Europe/Paris')).toBe('')
  })

  it.each([
    ['Africa/Casablanca', '2026-11-18T09:00:00.000Z'],
    ['Africa/Casablanca', '2028-08-03T08:00:00.000Z'],
    ['Europe/Paris', '2026-11-18T09:00:00.000Z']
  ])('gives back the instant in %s (%s) once parsed back', (zone, iso) => {
    const wall = formatLocalDateTime(new Date(iso), zone)

    expect(wall).toBe(moment.tz(iso, zone).format('YYYY-MM-DDTHH:mm'))
    expect(convertFormDateTimeToISO(wall, zone)).toBe(iso)
  })

  it('reads the wall clock with the tz data of moment-timezone, not the one of the browser', () => {
    // A browser whose tz data puts Casablanca at +00 in November 2026 (#1937)
    vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue([
      { type: 'year', value: '2026' },
      { type: 'month', value: '11' },
      { type: 'day', value: '18' },
      { type: 'hour', value: '09' },
      { type: 'minute', value: '00' }
    ])
    const iso = '2026-11-18T09:00:00.000Z'

    const wall = formatLocalDateTime(new Date(iso), 'Africa/Casablanca')

    expect(wall).toBe(
      moment.tz(iso, 'Africa/Casablanca').format('YYYY-MM-DDTHH:mm')
    )
    expect(convertFormDateTimeToISO(wall, 'Africa/Casablanca')).toBe(iso)
  })
})

describe('formatDateTimeInTimezone', () => {
  it('writes midnight as 00:00', () => {
    expect(
      formatDateTimeInTimezone('2026-10-07T22:00:00Z', 'Europe/Paris')
    ).toBe('2026-10-08T00:00')
  })
})
