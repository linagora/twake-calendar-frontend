import './dayjsSetup'
import { Dayjs } from 'dayjs'
import { PrintPeriod, PrintScale } from './types'

/** Safety net against a user picking a decade-long range at day scale. */
export const MAX_PRINT_PERIODS = 92

type DayjsUnit = 'day' | 'week' | 'month'

/** Localization inputs shared by every generated period label. */
export interface PrintLabelOptions {
  locale?: string
  weekPrefix?: string
}

const scaleToUnit: Record<PrintScale, DayjsUnit> = {
  day: 'day',
  week: 'week',
  month: 'month'
}

// `week` snaps to ISO weeks (Monday start) to match the central grid's
// `firstDay: 1` configuration.
const startOfPeriod = (date: Dayjs, scale: PrintScale): Dayjs =>
  scale === 'week' ? date.startOf('isoWeek') : date.startOf(scaleToUnit[scale])

const formatLabel = (
  start: Dayjs,
  end: Dayjs,
  scale: PrintScale,
  { locale = 'en', weekPrefix = 'Week' }: PrintLabelOptions
): string => {
  const localizedStart = start.locale(locale)
  switch (scale) {
    case 'day':
      return localizedStart.format('dddd LL')
    case 'month':
      return localizedStart.format('MMMM YYYY')
    case 'week': {
      const lastDay = end.subtract(1, 'day').locale(locale)
      const range = `${localizedStart.format('LL')} – ${lastDay.format('LL')}`
      return `${weekPrefix} ${start.isoWeek()} · ${range}`
    }
  }
}

/**
 * Splits `[rangeStart, rangeEnd]` into consecutive pages of the given scale.
 * Both bounds are treated inclusively, so a single day/week/month containing
 * the whole range yields exactly one page.
 */
export const buildPrintPeriods = (
  scale: PrintScale,
  rangeStart: Dayjs,
  rangeEnd: Dayjs,
  labels: PrintLabelOptions = {}
): PrintPeriod[] => {
  const unit = scaleToUnit[scale]
  const periods: PrintPeriod[] = []

  let cursor = startOfPeriod(rangeStart, scale)
  const lastStart = startOfPeriod(rangeEnd, scale)

  while (!cursor.isAfter(lastStart) && periods.length < MAX_PRINT_PERIODS) {
    const end = cursor.add(1, unit)
    periods.push({
      scale,
      start: cursor,
      end,
      label: formatLabel(cursor, end, scale, labels)
    })
    cursor = end
  }

  return periods
}
