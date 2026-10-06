import {
  getLongDateFormat,
  LONG_DATE_FORMAT
} from '@common/components/Event/utils/dateTimeFormatters'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/de'
import 'dayjs/locale/it'

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

  it('keeps the English ordering for English', () => {
    const date = dayjs('2026-09-25').locale('en')

    expect(date.format(getLongDateFormat('en'))).toBe(
      'Friday, September 25, 2026'
    )
  })

  it('falls back to the default format for unknown locales', () => {
    expect(getLongDateFormat('xx')).toBe(LONG_DATE_FORMAT)
    expect(getLongDateFormat(undefined)).toBe(LONG_DATE_FORMAT)
  })
})
