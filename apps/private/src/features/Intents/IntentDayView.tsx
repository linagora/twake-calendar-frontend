import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { parseIntentDate } from '@common/features/Intents/intentData'
import {
  failIntent,
  notifyIntentReady,
  terminateIntent
} from '@common/features/Intents/intentLifecycle'
import type { IntentHandlerProps } from '@common/features/Intents/types'
import type { CalendarApi } from '@fullcalendar/core'
import { Button } from '@linagora/twake-mui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import CalendarController from '../../components/Calendar/CalendarController'
import { useManageCalendarSelection } from '../../components/Calendar/hooks/useManageCalendarSelection'
import { IntentMessage } from './IntentMessage'
import './Intents.styl'

/** OPEN io.cozy.calendar.events: the user's calendar on the requested day. */
export function IntentDayView({
  service,
  data
}: IntentHandlerProps): JSX.Element {
  const { t } = useI18n()
  const day = useMemo(() => parseIntentDate(data), [data])
  const calendarRef = useRef<CalendarApi | null>(null)
  const [currentView, setCurrentView] = useState<string>(
    CALENDAR_VIEWS.timeGridDay
  )
  const {
    selectedCalendars,
    setSelectedCalendars,
    tempUsers,
    setTempUsers,
    selectedMiniDate,
    setSelectedMiniDate
  } = useManageCalendarSelection()

  useEffect(() => {
    if (!day) {
      failIntent(
        service,
        new Error('Invalid intent data: expected { date: "YYYY-MM-DD" }')
      )
      return
    }
    // The grid is mounted synchronously and sets the ref before this effect
    calendarRef.current?.gotoDate(day)
    notifyIntentReady(service)
  }, [day, service])

  const handleClose = (): void => {
    terminateIntent(service, null)
  }

  if (!day) {
    return <IntentMessage reason="invalidData" />
  }

  return (
    <div className="intent-day-view">
      <div className="intent-day-view__actions">
        <Button data-testid="intent-close" onClick={handleClose}>
          {t('intents.close')}
        </Button>
      </div>
      <div className="intent-day-view__calendar">
        <CalendarController
          calendarRef={calendarRef}
          // Unused by CalendarController, which navigates through calendarRef
          currentDate={new Date(`${day}T00:00`)}
          currentView={currentView}
          setCurrentView={setCurrentView}
          selectedCalendars={selectedCalendars}
          setSelectedCalendars={setSelectedCalendars}
          tempUsers={tempUsers}
          setTempUsers={setTempUsers}
          selectedMiniDate={selectedMiniDate}
          setSelectedMiniDate={setSelectedMiniDate}
          onViewChange={setCurrentView}
        />
      </div>
    </div>
  )
}
