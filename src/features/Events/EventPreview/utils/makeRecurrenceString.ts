import { RepetitionObject } from '../../EventsTypes'

const WEEK_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

interface MakeRecurrenceStringParams {
  repetition: RepetitionObject
  t: (k: string, p?: string | object) => string
  startText: string
  joinChar?: string
  enableStrForOneTimeInterval?: boolean
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

  const recurType: Record<string, string> = {
    daily: t('event.repeat.frequency.days'),
    weekly: t('event.repeat.frequency.weeks'),
    monthly: t('event.repeat.frequency.months'),
    yearly: t('event.repeat.frequency.years')
  }

  const interval = repetition.interval ?? 1

  if (interval === 1 && enableStrForOneTimeInterval) {
    recur.push(recurType[repetition.freq])
  }

  if (interval > 1) {
    recur.push(
      t('eventPreview.everyInterval', {
        interval,
        unit: recurType[repetition.freq] ?? repetition.freq
      })
    )
  }

  if (repetition.byday) {
    const weekDaysByOrder = WEEK_DAYS.filter(day =>
      repetition.byday?.includes(day)
    )
    recur.push(
      t('eventPreview.recurrenceOnDays', {
        days: weekDaysByOrder.map(s => t(`eventPreview.onDays.${s}`)).join(', ')
      })
    )
  }

  if (repetition.occurrences) {
    recur.push(
      t('eventPreview.forOccurrences', {
        count: repetition.occurrences
      })
    )
  }
  if (repetition.endDate) {
    recur.push(
      t('eventPreview.until', {
        date: new Date(repetition.endDate).toLocaleDateString(t('locale'), {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      })
    )
  }
  return recur.filter(Boolean).join(`${joinChar ?? ','} `)
}
