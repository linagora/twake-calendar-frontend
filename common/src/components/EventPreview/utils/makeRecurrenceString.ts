import { RepetitionObject } from '@common/types/Repetition'

const WEEK_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

interface MakeRecurrenceStringParams {
  repetition: RepetitionObject
  t: (k: string, p?: Record<string, unknown>) => string
  startText: string
  joinChar?: string
  enableStrForOneTimeInterval?: boolean
}

const getRecurType = (
  t: (k: string, p?: Record<string, unknown>) => string
): Record<string, string> => ({
  daily: t('event.repeat.frequency.days'),
  weekly: t('event.repeat.frequency.weeks'),
  monthly: t('event.repeat.frequency.months'),
  yearly: t('event.repeat.frequency.years')
})

const getIntervalText = (
  repetition: RepetitionObject,
  t: (k: string, p?: Record<string, unknown>) => string,
  enableStrForOneTimeInterval?: boolean
): string | undefined => {
  const interval = repetition.interval ?? 1
  const recurType = getRecurType(t)

  if (interval === 1 && enableStrForOneTimeInterval) {
    return recurType[repetition.freq]
  }

  if (interval > 1) {
    return t('eventPreview.everyInterval', {
      interval,
      unit: recurType[repetition.freq] ?? repetition.freq
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
      count: repetition.occurrences
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
  enableStrForOneTimeInterval
}: MakeRecurrenceStringParams): string | undefined {
  if (!repetition) return

  const recur: string[] = [startText]

  const intervalText = getIntervalText(
    repetition,
    t,
    enableStrForOneTimeInterval
  )
  if (intervalText) recur.push(intervalText)

  const byDayText = getByDayText(repetition, t)
  if (byDayText) recur.push(byDayText)

  const endConditionText = getEndConditionText(repetition, t)
  if (endConditionText) recur.push(endConditionText)

  return recur.filter(Boolean).join(`${joinChar ?? ','} `)
}
