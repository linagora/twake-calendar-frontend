import {
  DATE_FORMAT,
  formatLocalizedDate,
  getDateFormat,
  getLongDateFormat,
  LONG_DATE_FORMAT
} from '@common/components/Event/utils/dateTimeFormatters'
import ru from '@common/locales/ru.json'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/de'
import 'dayjs/locale/it'
import 'dayjs/locale/ru'

describe('getLongDateFormat', () => {
  it('orders the day before the month in French', () => {
    const date = dayjs('2026-09-25').locale('fr')

    expect(date.format(getLongDateFormat('fr'))).toBe(
      'vendredi 25 septembre 2026'
    )
  })

  it('writes the Spanish long date with its prepositions', () => {
    const date = dayjs('2026-09-25').locale('es')

    expect(date.format(getLongDateFormat('es'))).toBe(
      'viernes, 25 de septiembre de 2026'
    )
  })

  it('writes the German day as an ordinal', () => {
    const date = dayjs('2026-09-25').locale('de')

    expect(date.format(getLongDateFormat('de'))).toBe(
      'Freitag, 25. September 2026'
    )
  })

  it('orders the day before the month in Italian', () => {
    const date = dayjs('2026-09-25').locale('it')

    expect(date.format(getLongDateFormat('it'))).toBe(
      'venerdì 25 settembre 2026'
    )
  })

  it('orders the day before the month in English', () => {
    const date = dayjs('2026-09-25').locale('en')

    expect(date.format(getLongDateFormat('en'))).toBe(
      'Friday, 25 September 2026'
    )
  })

  it('falls back to the default format for unknown locales', () => {
    expect(getLongDateFormat('xx')).toBe(LONG_DATE_FORMAT)
    expect(getLongDateFormat(undefined)).toBe(LONG_DATE_FORMAT)
  })
})

describe('getDateFormat', () => {
  const date = dayjs('2026-10-07')

  it.each([
    ['de', '7. Oktober 2026'],
    ['fr', '7 octobre 2026'],
    ['es', '7 de octubre de 2026'],
    ['it', '7 ottobre 2026'],
    ['ru', '7 октября 2026'],
    ['en', '7 October 2026'],
    ['vi', '7 tháng 10, 2026']
  ])('writes the %s date in the language pattern', (locale, expected) => {
    expect(date.locale(locale).format(getDateFormat(locale))).toBe(expected)
  })

  it('falls back to the default format for unknown locales', () => {
    expect(getDateFormat('xx')).toBe(DATE_FORMAT)
    expect(getDateFormat(undefined)).toBe(DATE_FORMAT)
  })
})

describe('formatLocalizedDate', () => {
  it('matches the British English date used in the event preview', () => {
    const date = new Date('2026-10-26T10:00:00')
    const previewDate = date.toLocaleDateString('en-gb', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    expect(formatLocalizedDate('2026-10-26T10:00:00', 'en')).toBe(
      'Monday, 26 October 2026'
    )
    expect(formatLocalizedDate('2026-10-26T10:00:00', 'en')).toBe(previewDate)
  })

  it('capitalises the French weekday for standalone labels', () => {
    expect(formatLocalizedDate('2026-10-06T15:00:00', 'fr')).toBe(
      'Mardi 6 octobre 2026'
    )
  })

  it('keeps the French weekday lowercase inside a sentence', () => {
    expect(
      formatLocalizedDate('2026-10-06T15:00:00', 'fr', { capitalize: false })
    ).toBe('mardi 6 octobre 2026')
  })

  it('writes the Vietnamese date like the date pickers do', () => {
    const date = '2026-10-06T15:00:00'
    const pickerText = dayjs(date).locale('vi').format(getLongDateFormat('vi'))

    expect(formatLocalizedDate(date, 'vi')).toBe('Thứ ba, 6 tháng 10, 2026')
    expect(formatLocalizedDate(date, 'vi').toLowerCase()).toBe(
      pickerText.toLowerCase()
    )
  })

  it('keeps the Russian weekday lowercase inside a sentence', () => {
    expect(
      formatLocalizedDate('2026-10-06T15:00:00', 'ru', { capitalize: false })
    ).toMatch(/^вторник/)
  })

  it('does not put the nominative Russian weekday after "на" in the booking confirmation', () => {
    const subtitle = ru.booking.success.subtitle
      .replace(
        '%{date}',
        formatLocalizedDate('2026-10-14T09:30:00', 'ru', { capitalize: false })
      )
      .replace('%{owner}', 'alice')
      .replace('%{time}', '09:30')

    expect(subtitle).toBe(
      'Ваша встреча с alice назначена: среда, 14 октября 2026 в 09:30'
    )
  })
})
