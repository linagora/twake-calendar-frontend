import { formatDateInTimezone } from '@common/components/Event/utils/dateTimeFormatters'

describe('formatDateInTimezone', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('formats the day as YYYY-MM-DD in the target timezone', () => {
    expect(
      formatDateInTimezone(new Date('2026-10-08T09:00:00Z'), 'Europe/Paris')
    ).toBe('2026-10-08')
  })

  it('uses the day of the target timezone across midnight', () => {
    const date = new Date('2026-10-07T22:30:00Z')

    expect(formatDateInTimezone(date, 'Europe/Paris')).toBe('2026-10-08')
    expect(formatDateInTimezone(date, 'America/New_York')).toBe('2026-10-07')
  })

  it('does not rely on the locale pattern of the engine (WebKit en-CA)', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'format', 'get').mockReturnValue(
      () => '10/8/2026'
    )

    expect(
      formatDateInTimezone(new Date('2026-10-08T09:00:00Z'), 'Europe/Paris')
    ).toBe('2026-10-08')
  })
})
