import { formatNoEventsPeriod } from '@common/components/Calendar/NoEventsContent'

describe('formatNoEventsPeriod', () => {
  it('gives the first and last days of a week', () => {
    const period = {
      start: new Date('2026-10-19T00:00:00Z'),
      end: new Date('2026-10-26T00:00:00Z')
    }

    expect(formatNoEventsPeriod(period, 'en-gb', 'UTC')).toEqual({
      start: '19 October',
      end: '25 October'
    })
  })

  it('gives the first and last days of a month', () => {
    const period = {
      start: new Date('2026-10-01T00:00:00Z'),
      end: new Date('2026-11-01T00:00:00Z')
    }

    expect(formatNoEventsPeriod(period, 'en-gb', 'UTC')).toEqual({
      start: '1 October',
      end: '31 October'
    })
  })

  it('reads the boundaries in the calendar timezone', () => {
    // Midnights in Paris, the evening before in UTC
    const period = {
      start: new Date('2026-10-18T22:00:00Z'),
      end: new Date('2026-10-25T23:00:00Z')
    }

    expect(formatNoEventsPeriod(period, 'en-gb', 'Europe/Paris')).toEqual({
      start: '19 October',
      end: '25 October'
    })
  })
})
