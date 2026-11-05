import {
  formatDateTimeInTimezone,
  formatLocalDateTime
} from '@common/components/Event/utils/dateTimeFormatters'

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
})

describe('formatDateTimeInTimezone', () => {
  it('writes midnight as 00:00', () => {
    expect(
      formatDateTimeInTimezone('2026-10-07T22:00:00Z', 'Europe/Paris')
    ).toBe('2026-10-08T00:00')
  })
})
