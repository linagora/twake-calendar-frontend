import {
  formatDateInTimezone,
  formatDateTimeInTimezone,
  formatLocalDateTime
} from '@common/components/Event/utils/dateTimeFormatters'

describe('dateTimeFormatters', () => {
  // 2026-10-06T23:00:00Z is Wednesday 7 October 2026 01:00 in Europe/Paris
  const date = new Date('2026-10-06T23:00:00Z')

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('formatLocalDateTime', () => {
    it('formats in the given timezone', () => {
      expect(formatLocalDateTime(date, 'Europe/Paris')).toBe('2026-10-07T01:00')
    })

    it('renders midnight as 00', () => {
      expect(
        formatLocalDateTime(new Date('2026-10-07T22:00:00Z'), 'Europe/Paris')
      ).toBe('2026-10-08T00:00')
    })

    it('does not depend on the engine en-CA layout (WebKit renders MM/DD/YYYY)', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'format', 'get').mockReturnValue(
        () => '10/07/2026, 01:00'
      )

      expect(formatLocalDateTime(date, 'Europe/Paris')).toBe('2026-10-07T01:00')
    })

    it('returns an empty string for invalid dates', () => {
      expect(formatLocalDateTime(new Date('invalid'), 'Europe/Paris')).toBe('')
    })
  })

  describe('formatDateInTimezone', () => {
    it('returns the calendar day in the given timezone', () => {
      expect(formatDateInTimezone(date, 'Europe/Paris')).toBe('2026-10-07')
      expect(formatDateInTimezone(date, 'America/New_York')).toBe('2026-10-06')
    })

    it('does not depend on the engine en-CA layout (WebKit renders MM/DD/YYYY)', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'format', 'get').mockReturnValue(
        () => '10/07/2026'
      )

      expect(formatDateInTimezone(date, 'Europe/Paris')).toBe('2026-10-07')
    })
  })

  describe('formatDateTimeInTimezone', () => {
    it('formats an ISO string in the given timezone', () => {
      expect(
        formatDateTimeInTimezone('2026-10-06T23:00:00Z', 'Europe/Paris')
      ).toBe('2026-10-07T01:00')
    })
  })
})
