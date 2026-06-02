import { translateDuration } from '@/features/Events/EventPreview/utils/parseDuration'

describe('translateDuration', () => {
  const mockT = jest.fn(
    (key: string, params?: { duration?: string; count?: number }) => {
      if (params) {
        if (key.includes('duration_')) {
          const direction = key.endsWith('before') ? 'before' : 'after'
          return `${params.duration} ${direction}`
        }

        const unit = ['week', 'day', 'hour', 'minute', 'second'].find(u =>
          key.includes(u)
        )
        if (unit) {
          const suffix = params.count === 1 ? '' : 's'
          return `${params.count} ${unit}${suffix}`
        }
      }

      const translations: Record<string, string> = {
        'event.form.notifications.-PT15M': '15 minutes before',
        'event.form.notifications.-PT30M': '30 minutes before',
        'event.form.notifications.EMAIL': 'email'
      }

      return translations[key] || key
    }
  )

  beforeEach(() => {
    mockT.mockClear()
  })

  it('uses exact translations if they exist in the locales', () => {
    expect(translateDuration('-PT15M', mockT)).toBe('15 minutes before')
    expect(translateDuration('-PT30M', mockT)).toBe('30 minutes before')
    expect(translateDuration('EMAIL', mockT)).toBe('email')
  })

  it('parses and dynamically translates custom minutes durations', () => {
    // 20 minutes before
    expect(translateDuration('-PT20M', mockT)).toBe('20 minutes before')
    // 1 minute before (singular)
    expect(translateDuration('-PT1M', mockT)).toBe('1 minute before')
  })

  it('parses and dynamically translates custom hours durations', () => {
    // 2 hours before
    expect(translateDuration('-PT2H', mockT)).toBe('2 hours before')
    // 1 hour before (singular)
    expect(translateDuration('-PT1H', mockT)).toBe('1 hour before')
  })

  it('parses and dynamically translates custom days durations', () => {
    // 3 days before
    expect(translateDuration('-P3D', mockT)).toBe('3 days before')
    // 1 day before
    expect(translateDuration('-P1D', mockT)).toBe('1 day before')
  })

  it('parses and dynamically translates custom weeks durations', () => {
    // 2 weeks before
    expect(translateDuration('-P2W', mockT)).toBe('2 weeks before')
  })

  it('parses and dynamically translates custom seconds durations', () => {
    // 45 seconds before
    expect(translateDuration('-PT45S', mockT)).toBe('45 seconds before')
  })

  it('parses positive duration (after event)', () => {
    expect(translateDuration('PT45M', mockT)).toBe('45 minutes after')
  })

  it('parses durations with misplaced T (like -PT1D or -PT1W)', () => {
    expect(translateDuration('-PT1D', mockT)).toBe('1 day before')
    expect(translateDuration('-PT2D', mockT)).toBe('2 days before')
    expect(translateDuration('-PT1W', mockT)).toBe('1 week before')
  })

  it('parses combined durations', () => {
    expect(translateDuration('-PT1H30M', mockT)).toBe(
      '1 hour 30 minutes before'
    )
  })

  it('returns original string if it is not a valid ISO 8601 duration', () => {
    expect(translateDuration('invalid-duration', mockT)).toBe(
      'invalid-duration'
    )
  })

  it('returns original string if the duration has zero non-zero components', () => {
    expect(translateDuration('PT0S', mockT)).toBe('PT0S')
  })
})
