import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { deDE, esES, frFR, itIT, ruRU, viVN } from '@mui/x-date-pickers/locales'
import {
  pickersLocaleText,
  toAdapterLocale
} from '@common/components/DateTimePicker/TwakeLocalizationProvider'

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

describe('pickersLocaleText', () => {
  it('names the month navigation in the user language', () => {
    expect(pickersLocaleText('fr-fr').previousMonth).toBe('Mois précédent')
  })

  it.each([
    ['fr-fr', frFR],
    ['de-de', deDE],
    ['es-es', esES],
    ['ru-ru', ruRU],
    ['vi', viVN]
  ])('uses the MUI X texts of %s', (locale, expected) => {
    expect(pickersLocaleText(locale)).toEqual(
      expected.components.MuiLocalizationProvider.defaultProps.localeText
    )
    expect(pickersLocaleText(locale).nextMonth).not.toBe('Next month')
  })

  it('uses the MUI X texts of it-it', () => {
    expect(pickersLocaleText('it-it')).toEqual({
      ...itIT.components.MuiLocalizationProvider.defaultProps.localeText,
      calendarViewSwitchingButtonAriaLabel: expect.any(Function)
    })
  })

  it('names the Italian view switch grammatically', () => {
    const label =
      pickersLocaleText('it-it').calendarViewSwitchingButtonAriaLabel
    expect(label?.('day')).toBe(
      "la vista del calendario è aperta, passare alla vista dell'anno"
    )
    expect(label?.('year')).toBe(
      "la vista dell'anno è aperta, passare alla vista del calendario"
    )
  })

  it('falls back to English', () => {
    expect(pickersLocaleText('locale').previousMonth).toBe('Previous month')
    expect(pickersLocaleText(undefined).nextMonth).toBe('Next month')
  })
})
