import {
  convertEventDateTimeToISO,
  isValidTimeZone,
  resolveKnownTimezone
} from '@common/utils/timezone'

describe('resolveKnownTimezone', () => {
  it('keeps a zone known to the browser', () => {
    expect(resolveKnownTimezone('Europe/Paris')).toBe('Europe/Paris')
  })

  it('falls back to UTC on a zone unknown to the browser', () => {
    expect(resolveKnownTimezone('Mars/Olympus_Mons')).toBe('UTC')
    expect(resolveKnownTimezone('America/Nuidew_York')).toBe('UTC')
  })
})

describe('isValidTimeZone', () => {
  it('accepts a zone known to the browser', () => {
    expect(isValidTimeZone('Europe/Paris')).toBe(true)
  })

  it('rejects a zone unknown to the browser', () => {
    expect(isValidTimeZone('Mars/Phobos')).toBe(false)
  })

  it('rejects missing and non string values', () => {
    expect(isValidTimeZone(null)).toBe(false)
    expect(isValidTimeZone(undefined)).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone(12345)).toBe(false)
  })
})

describe('convertEventDateTimeToISO', () => {
  it('should format a basic date-time string in UTC correctly', () => {
    const result = convertEventDateTimeToISO('20240405T150000Z', 'UTC')
    expect(result).toBe('2024-04-05T15:00:00Z')
  })

  it('should format a basic date-time string with numeric offset correctly', () => {
    const result = convertEventDateTimeToISO(
      '20240308T170000+0100',
      'Europe/Paris'
    )
    expect(result).toBe('2024-03-08T17:00:00+01:00')
  })

  it('should format a basic floating date-time string in a timezone correctly to local moment ISO', () => {
    const result = convertEventDateTimeToISO('20240308T170000', 'Europe/Paris')
    expect(result).toBe('2024-03-08T16:00:00.000Z') // UTC-normalized equivalent of Europe/Paris winter time (UTC+1)
  })

  it('should leave an already normalized extended ISO string in UTC unchanged', () => {
    const result = convertEventDateTimeToISO('2024-04-05T15:00:00Z', 'UTC')
    expect(result).toBe('2024-04-05T15:00:00Z')
  })

  it('should leave an already normalized extended ISO string with offset unchanged', () => {
    const result = convertEventDateTimeToISO(
      '2024-03-08T17:00:00+01:00',
      'Europe/Paris'
    )
    expect(result).toBe('2024-03-08T17:00:00+01:00')
  })
})
