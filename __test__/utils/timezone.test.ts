import {
  convertEventDateTimeToISO,
  isMomentZone,
  isValidTimeZone,
  resolveTimezone
} from '@common/utils/timezone'
import {
  findTimezoneAlias,
  findTimezoneData
} from '@common/utils/timezone-data'
import { makeTimezone } from '@common/features/Events/utils/makeTimezone'
import { CalendarEvent } from '@common/types/EventsTypes'

const prototypeMembers = ['toString', 'constructor', 'hasOwnProperty']

describe('findTimezoneData', () => {
  it('finds a known zone', () => {
    expect(findTimezoneData('Europe/Paris')?.ics).toContain('Europe/Paris')
  })

  it.each(prototypeMembers)(
    'does not take the Object.prototype member %s for a zone',
    name => {
      expect(findTimezoneData(name)).toBeUndefined()
      expect(findTimezoneAlias(name)).toBeUndefined()
    }
  )
})

describe('resolveTimezone', () => {
  it('resolves an alias to its zone', () => {
    expect(resolveTimezone('US/Central')).toBe('America/Chicago')
  })

  it.each(prototypeMembers)(
    'keeps a zone named like the Object.prototype member %s',
    name => {
      expect(resolveTimezone(name)).toBe(name)
    }
  )
})

describe('isMomentZone', () => {
  it('knows an IANA zone', () => {
    expect(isMomentZone('Europe/Paris')).toBe(true)
  })

  it.each([...prototypeMembers, '__proto__'])(
    'answers no for the Object.prototype member %s',
    name => {
      expect(isMomentZone(name)).toBe(false)
    }
  )
})

describe('makeTimezone', () => {
  it('falls back to Etc/UTC when the data carries no ICS', () => {
    const event = { timezone: 'toString' } as CalendarEvent

    const timezone = makeTimezone(
      Object.prototype.toString as unknown as undefined,
      event
    )

    expect(timezone.tzid).toBe('Etc/UTC')
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
