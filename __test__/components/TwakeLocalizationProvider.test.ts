import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { toAdapterLocale } from '@common/components/DateTimePicker/TwakeLocalizationProvider'

describe('toAdapterLocale', () => {
  it.each([
    ['en-gb', 'en'],
    ['fr-fr', 'fr'],
    ['es-es', 'es'],
    ['de-de', 'de'],
    ['it-it', 'it'],
    ['ru-ru', 'ru'],
    ['vi', 'vi'],
    ['DE-DE', 'de']
  ])('maps %s to %s', (locale, expected) => {
    expect(toAdapterLocale(locale)).toBe(expected)
  })

  it('falls back to English', () => {
    expect(toAdapterLocale(undefined)).toBe('en')
    expect(toAdapterLocale('')).toBe('en')
  })

  it('gives the date pickers the locale formats, not the English ones', () => {
    const adapter = new AdapterDayjs({ locale: toAdapterLocale('de-de') })
    const date = adapter.date('2026-10-05T10:00:00')
    expect(adapter.format(date, 'keyboardDate')).toBe('05.10.2026')
  })
})
