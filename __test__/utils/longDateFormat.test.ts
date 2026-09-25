import {
  getLongDateFormat,
  LONG_DATE_FORMAT
} from '@common/components/Event/utils/dateTimeFormatters'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

describe('getLongDateFormat', () => {
  it('orders the day before the month in French', () => {
    const date = dayjs('2026-09-25').locale('fr')

    expect(date.format(getLongDateFormat('fr'))).toBe(
      'vendredi 25 septembre 2026'
    )
  })

  it('keeps the English ordering for English', () => {
    const date = dayjs('2026-09-25').locale('en')

    expect(date.format(getLongDateFormat('en'))).toBe(
      'Friday, September 25, 2026'
    )
  })

  it('falls back to the default format for unknown locales', () => {
    expect(getLongDateFormat('de')).toBe(LONG_DATE_FORMAT)
    expect(getLongDateFormat(undefined)).toBe(LONG_DATE_FORMAT)
  })
})
