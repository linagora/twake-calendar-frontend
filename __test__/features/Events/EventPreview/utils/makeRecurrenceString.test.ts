import { makeRecurrenceString } from '@common/components/EventPreview/utils/makeRecurrenceString'
import de from '@common/locales/de.json'
import en from '@common/locales/en.json'
import es from '@common/locales/es.json'
import fr from '@common/locales/fr.json'
import italian from '@common/locales/it.json'
import ru from '@common/locales/ru.json'
import vietnamese from '@common/locales/vi.json'
import { RepetitionObject } from '@common/types/Repetition'

const LOCALES = { de, en, es, fr, it: italian, ru, vi: vietnamese }

describe('makeRecurrenceString', () => {
  const freqUnits: Record<string, string> = {
    daily: 'days',
    weekly: 'weeks',
    monthly: 'months',
    yearly: 'years'
  }

  const mockT = vi.fn((key: string, params?: any) => {
    if (params) {
      if (key === 'eventPreview.everyInterval') {
        return `Every ${params.interval} ${params.unit}`
      }
      if (key === 'eventPreview.recurrenceOnDays') {
        return `on ${params.days}`
      }
      if (key.startsWith('eventPreview.everyIntervalByFreq.')) {
        const freq = key.split('.').pop()
        return `Every ${params.smart_count} ${freqUnits[freq ?? '']}`
      }
      if (key === 'eventPreview.forOccurrences') {
        return `for ${params.smart_count} times`
      }
      if (key === 'eventPreview.until') {
        return `until ${params.date}`
      }
    }

    const translations: Record<string, string> = {
      'eventPreview.everyFreq.daily': 'Every day',
      'eventPreview.everyFreq.weekly': 'Every week',
      'eventPreview.everyFreq.monthly': 'Every month',
      'eventPreview.everyFreq.yearly': 'Every year',
      'eventPreview.onDays.MO': 'Monday',
      'eventPreview.onDays.TU': 'Tuesday',
      'eventPreview.onDays.WE': 'Wednesday',
      'eventPreview.onDays.TH': 'Thursday',
      'eventPreview.onDays.FR': 'Friday',
      'eventPreview.onDays.SA': 'Saturday',
      'eventPreview.onDays.SU': 'Sunday',
      locale: 'en-US'
    }

    return translations[key] || key
  })

  const startText = 'Repeats'

  beforeEach(() => {
    mockT.mockClear()
  })

  it('formats string for interval === 1 when enableStrForOneTimeInterval is true', () => {
    const repetition: RepetitionObject = { freq: 'daily', interval: 1 }
    const result = makeRecurrenceString({
      repetition,
      t: mockT,
      startText,
      enableStrForOneTimeInterval: true
    })

    expect(result).toBe('Repeats, Every day')
  })

  it('formats string when interval is undefined', () => {
    const repetition: RepetitionObject = { freq: 'daily' }
    const result = makeRecurrenceString({
      repetition,
      t: mockT,
      startText,
      enableStrForOneTimeInterval: true
    })

    expect(result).toBe('Repeats, Every day')
  })

  it('formats string for interval > 1', () => {
    const repetition: RepetitionObject = { freq: 'weekly', interval: 2 }
    const result = makeRecurrenceString({ repetition, t: mockT, startText })

    expect(result).toBe('Repeats, Every 2 weeks')
    expect(mockT).toHaveBeenCalledWith(
      'eventPreview.everyIntervalByFreq.weekly',
      { smart_count: 2 }
    )
  })

  it('falls back to the raw frequency for unsupported frequencies', () => {
    const repetition: RepetitionObject = { freq: 'hourly', interval: 2 }
    const result = makeRecurrenceString({ repetition, t: mockT, startText })

    expect(result).toBe('Repeats, Every 2 hourly')
  })

  it('formats string with specific days and sorts them according to WEEK_DAYS order', () => {
    const repetition: RepetitionObject = {
      freq: 'weekly',
      interval: 1,
      byday: ['WE', 'MO', 'FR']
    }
    const result = makeRecurrenceString({ repetition, t: mockT, startText })

    // Expected order: MO, WE, FR
    expect(result).toBe('Repeats, on Monday, Wednesday, Friday')
  })

  it('formats string with occurrences count', () => {
    const repetition: RepetitionObject = {
      freq: 'daily',
      interval: 1,
      occurrences: 5
    }
    const result = makeRecurrenceString({ repetition, t: mockT, startText })

    expect(result).toBe('Repeats, for 5 times')
  })

  it('formats string with end date', () => {
    const endDate = '2025-12-31T00:00:00.000Z'
    const repetition: RepetitionObject = {
      freq: 'daily',
      interval: 1,
      endDate
    }
    const result = makeRecurrenceString({ repetition, t: mockT, startText })

    const formattedDate = new Date(endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    expect(result).toBe(`Repeats, until ${formattedDate}`)
  })

  it('combines multiple properties', () => {
    const endDate = '2025-12-31T00:00:00.000Z'
    const repetition: RepetitionObject = {
      freq: 'monthly',
      interval: 3,
      byday: ['TU', 'TH'],
      endDate
    }
    const result = makeRecurrenceString({ repetition, t: mockT, startText })

    const formattedDate = new Date(endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    expect(result).toBe(
      `Repeats, Every 3 months, on Tuesday, Thursday, until ${formattedDate}`
    )
  })

  it('uses custom joinChar when provided', () => {
    const repetition: RepetitionObject = {
      freq: 'weekly',
      interval: 2,
      occurrences: 10
    }
    const result = makeRecurrenceString({
      repetition,
      t: mockT,
      startText,
      joinChar: ';'
    })

    expect(result).toBe('Repeats; Every 2 weeks; for 10 times')
  })

  it('ignores unsupported frequencies for interval === 1', () => {
    const repetition: RepetitionObject = { freq: 'hourly', interval: 1 }
    const result = makeRecurrenceString({
      repetition,
      t: mockT,
      startText,
      enableStrForOneTimeInterval: true
    })

    expect(result).toBe('Repeats')
  })

  describe('with the real locales, as in the collapsed event form', () => {
    const makeLocaleT =
      (locale: Record<string, unknown>) =>
      (key: string, params?: Record<string, unknown>): string => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            locale
          )
        return Object.entries(params ?? {}).reduce(
          (text, [name, param]) => text.replace(`%{${name}}`, String(param)),
          typeof value === 'string' ? value : key
        )
      }

    const summarize = (
      locale: Record<string, unknown>,
      repetition: RepetitionObject
    ): string | undefined =>
      makeRecurrenceString({
        repetition,
        t: makeLocaleT(locale),
        startText: '',
        joinChar: '',
        enableStrForOneTimeInterval: true
      })

    const weeklyOnThursday: RepetitionObject = {
      freq: 'weekly',
      interval: 1,
      byday: ['TH']
    }

    it.each([
      ['en', 'Every week on Thursday'],
      ['fr', 'Toutes les semaines le jeudi'],
      ['ru', 'Каждую неделю по четвергам'],
      ['de', 'Jede Woche am Donnerstag'],
      ['es', 'Cada semana los jueves'],
      ['it', 'Ogni settimana il giovedì'],
      ['vi', 'Hàng tuần vào thứ năm']
    ] as const)('reads as a sentence in %s', (lang, expected) => {
      expect(summarize(LOCALES[lang], weeklyOnThursday)).toBe(expected)
    })

    it.each(Object.entries(LOCALES))(
      'translates every frequency with an interval of 1 in %s',
      (_lang, locale) => {
        expect(Object.keys(locale.eventPreview.everyFreq)).toEqual([
          'daily',
          'weekly',
          'monthly',
          'yearly'
        ])
        Object.entries(locale.eventPreview.everyFreq).forEach(
          ([freq, expected]) => {
            expect(summarize(locale, { freq, interval: 1 })).toBe(expected)
          }
        )
      }
    )
  })
})
