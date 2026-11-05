import { RepetitionObject } from '@common/types/Repetition'

const WEEK_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

interface MakeRecurrenceStringParams {
  repetition: RepetitionObject
  t: (k: string, p?: Record<string, unknown>) => string
  startText: string
  joinChar?: string
  enableStrForOneTimeInterval?: boolean
  fallbackIntervalText?: string
}

const SUPPORTED_FREQS = ['daily', 'weekly', 'monthly', 'yearly']

const getIntervalText = (
  repetition: RepetitionObject,
  t: (k: string, p?: Record<string, unknown>) => string,
  enableStrForOneTimeInterval?: boolean
): string | undefined => {
  const interval = repetition.interval ?? 1
  const isSupportedFreq = SUPPORTED_FREQS.includes(repetition.freq)

  if (interval === 1 && enableStrForOneTimeInterval) {
    return isSupportedFreq
      ? t(`eventPreview.everyFreq.${repetition.freq}`)
      : undefined
  }

  if (interval > 1 && isSupportedFreq) {
    return t(`eventPreview.everyIntervalByFreq.${repetition.freq}`, {
      smart_count: interval
    })
  }

  if (interval > 1) {
    return t('eventPreview.everyInterval', {
      interval,
      unit: repetition.freq
    })
  }

  return undefined
}

const getByDayText = (
  repetition: RepetitionObject,
  t: (k: string, p?: Record<string, unknown>) => string
): string | undefined => {
  if (!repetition.byday) return undefined

  const weekDaysByOrder = WEEK_DAYS.filter(day =>
    repetition.byday?.includes(day)
  )
  return t('eventPreview.recurrenceOnDays', {
    days: weekDaysByOrder.map(s => t(`eventPreview.onDays.${s}`)).join(', ')
  })
}

const getEndConditionText = (
  repetition: RepetitionObject,
  t: (k: string, p?: Record<string, unknown>) => string
): string | undefined => {
  if (repetition.occurrences) {
    return t('eventPreview.forOccurrences', {
      smart_count: repetition.occurrences
    })
  }
  if (repetition.endDate) {
    return t('eventPreview.until', {
      date: new Date(repetition.endDate).toLocaleDateString(t('locale'), {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    })
  }
  return undefined
}

export function makeRecurrenceString({
  repetition,
  t,
  startText,
  joinChar,
  enableStrForOneTimeInterval,
  fallbackIntervalText
}: MakeRecurrenceStringParams): string | undefined {
  if (!repetition) return

  const recur: string[] = [startText]

  const intervalText =
    getIntervalText(repetition, t, enableStrForOneTimeInterval) ??
    fallbackIntervalText
  if (intervalText) recur.push(intervalText)

  const byDayText = getByDayText(repetition, t)
  if (byDayText) recur.push(byDayText)

  const endConditionText = getEndConditionText(repetition, t)
  if (endConditionText) recur.push(endConditionText)

  return recur.filter(Boolean).join(`${joinChar ?? ','} `)
}
