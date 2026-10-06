import { useAppSelector } from '@common/app/hooks'
import { User } from '@common/components/Attendees/types'
import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import {
  DisplayedPeriod,
  formatPeriodLabel
} from '@common/components/Menubar/periodLabel'
import { useEmbeddedCalendarId } from '@common/features/Embed/embeddedCalendar'
import { Button, Stack, Typography } from '@linagora/twake-mui'
import type { CalendarApi } from '@fullcalendar/core'
import AddIcon from '@mui/icons-material/Add'
import { useMemo, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import CalendarController, { CalendarControllerRef } from './CalendarController'

const NO_USERS: User[] = []
const noop = (): void => {}

/**
 * The team calendar of a space, as TwakeSpace frames it in the Calendar tab
 * of the space: the events of that calendar as a list, without the bar and
 * the sidebar of the application.
 */
export function EmbeddedCalendar(): JSX.Element | null {
  const { t } = useI18n()
  const calendarRef = useRef<CalendarApi | null>(null)
  const controllerRef = useRef<CalendarControllerRef | null>(null)
  const calendarId = useEmbeddedCalendarId()
  const selectedCalendars = useMemo(
    () => (calendarId ? [calendarId] : []),
    [calendarId]
  )
  const isSignedIn = useAppSelector(state => Boolean(state.user.tokens))
  const pending = useAppSelector(state => state.calendars.pending)
  const isMember = useAppSelector(state =>
    Boolean(calendarId && state.calendars.list[calendarId])
  )

  const [currentDate, setCurrentDate] = useState(new Date())
  const [displayedPeriod, setDisplayedPeriod] = useState<DisplayedPeriod>()

  if (!isSignedIn) return null

  if (!isMember) {
    // Loading the calendars. Once the calendar is known, pending only means
    // that events are loading: the view stays, or it would load them again.
    if (pending) return null
    return (
      <Stack
        sx={{ alignItems: 'center', justifyContent: 'center', height: '100vh' }}
      >
        <Typography>{t('embed.calendarUnavailable')}</Typography>
      </Stack>
    )
  }

  return (
    <div className="App">
      <main className="main-layout isInIframe">
        <div className="calendar">
          <header className="menubar">
            <Typography className="current-date-time">
              {formatPeriodLabel(displayedPeriod, currentDate, t)}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => controllerRef.current?.handleCreateEvent()}
            >
              {t('event.createEvent')}
            </Button>
          </header>
          <CalendarController
            calendarRef={calendarRef}
            controllerRef={controllerRef}
            currentDate={currentDate}
            currentView={CALENDAR_VIEWS.listWeek}
            setCurrentView={noop}
            selectedCalendars={selectedCalendars}
            setSelectedCalendars={noop}
            tempUsers={NO_USERS}
            setTempUsers={noop}
            selectedMiniDate={null}
            setSelectedMiniDate={noop}
            onDateChange={setCurrentDate}
            onPeriodChange={setDisplayedPeriod}
            onViewChange={noop}
          />
        </div>
      </main>
    </div>
  )
}
