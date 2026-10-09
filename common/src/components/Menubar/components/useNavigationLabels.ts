import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { useI18n } from 'twake-i18n'

const STEP_KEYS: Record<string, [string, string]> = {
  [CALENDAR_VIEWS.timeGridDay]: ['menubar.prevDay', 'menubar.nextDay'],
  [CALENDAR_VIEWS.timeGridWeek]: ['menubar.prevWeek', 'menubar.nextWeek'],
  [CALENDAR_VIEWS.listWeek]: ['menubar.prevWeek', 'menubar.nextWeek'],
  [CALENDAR_VIEWS.dayGridMonth]: ['menubar.prevMonth', 'menubar.nextMonth']
}

export function useNavigationLabels(currentView: string): {
  prev: string
  next: string
} {
  const { t } = useI18n()
  const [prev, next] = STEP_KEYS[currentView] ?? [
    'menubar.prev',
    'menubar.next'
  ]
  return { prev: t(prev), next: t(next) }
}
