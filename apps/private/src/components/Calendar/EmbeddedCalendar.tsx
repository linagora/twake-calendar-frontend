import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { User } from '@common/components/Attendees/types'
import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import {
  DisplayedPeriod,
  formatPeriodLabel
} from '@common/components/Menubar/periodLabel'
import { NavigationControls } from '@common/components/Menubar/components/NavigationControls'
import {
  EMBED_CALENDAR_PREFIX,
  useEmbeddedCalendarId,
  useEmbeddedEventUid
} from '@common/features/Embed/embeddedCalendar'
import { embedRoute } from '@linagora/twake-embed'
import { Button, Stack, Typography } from '@linagora/twake-mui'
import type { CalendarApi } from '@fullcalendar/core'
import AddIcon from '@mui/icons-material/Add'
import { useMemo, useRef, useState } from 'react'
import { replace } from 'redux-first-history'
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

  const dispatch = useAppDispatch()
  const eventUid = useEmbeddedEventUid()
  // A team calendar lives at /calendars/<id>/<id>: its events are in its home
  const teamCalendarId = calendarId?.split('/')[0] ?? null

  const [currentDate, setCurrentDate] = useState(new Date())
  const [displayedPeriod, setDisplayedPeriod] = useState<DisplayedPeriod>()

  // Back to the calendar once the event's preview closes: the report of the
  // new URL brings TwakeSpace's address along, and a click on the same card
  // opens the event again
  const closeEvent = (): void => {
    if (eventUid && teamCalendarId) {
      dispatch(replace(embedRoute(EMBED_CALENDAR_PREFIX, teamCalendarId)))
    }
  }

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
    <div className="App isEmbedded">
      <main className="main-layout isInIframe">
        <div className="calendar">
          <header className="menubar">
            <div className="left-menu">
              <div className="menu-items">
                <NavigationControls
                  onNavigate={action => calendarRef.current?.[action]()}
                />
              </div>
              <div className="menu-items">
                <Typography variant="h5">
                  {formatPeriodLabel(displayedPeriod, currentDate, t)}
                </Typography>
              </div>
            </div>
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
            eventUid={eventUid}
            eventHome={teamCalendarId}
            onCloseEvent={closeEvent}
          />
        </div>
      </main>
    </div>
  )
}
