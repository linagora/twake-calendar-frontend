import { useAppDispatch, useAppSelector } from '@/app/hooks'
import SettingsPage from '@/features/Settings/SettingsPage'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { getViewRange } from '@/utils/dateUtils'
import type { CalendarApi } from '@fullcalendar/core'
import CozyBridge from 'cozy-external-bridge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorSnackbar } from '../Error/ErrorSnackbar'
import { refreshCalendars } from '../Event/utils/eventUtils'
import { Menubar, MenubarProps } from '../Menubar/Menubar'
import CalendarApp from './Calendar'
import { CALENDAR_VIEWS } from './utils/constants'
import { setView } from '@/features/Settings/SettingsSlice'

export default function CalendarLayout(): JSX.Element {
  const calendarRef = useRef<CalendarApi | null>(null)
  const dispatch = useAppDispatch()
  const error = useAppSelector(state => state.calendars.error)
  const selectedCalendars = useAppSelector(state => state.calendars.list)
  const tempcalendars = useAppSelector(state => state.calendars.templist)
  const view = useAppSelector(state => state.settings.view)

  const { isTablet, isTooSmall: isMobile } = useScreenSizeDetection()
  const [openSidebar, setOpenSideBar] = useState(false)

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [currentView, setCurrentView] = useState<string>(
    isTablet || isMobile
      ? CALENDAR_VIEWS.timeGridDay
      : CALENDAR_VIEWS.timeGridWeek
  )

  useEffect(() => {
    const setView = (): void =>
      setCurrentView(
        isTablet || isMobile
          ? CALENDAR_VIEWS.timeGridDay
          : CALENDAR_VIEWS.timeGridWeek
      )
    setView()
  }, [isTablet, isMobile])
  const isInIframe = useMemo(() => new CozyBridge().isInIframe(), [])

  const handleRefresh = async (): Promise<void> => {
    // Get current calendar range
    if (calendarRef.current) {
      const view = calendarRef.current.view
      const calendarRange = getViewRange(view.activeStart, view.type)

      // Refresh events for selected calendars
      await refreshCalendars(
        dispatch,
        Object.values(selectedCalendars),
        calendarRange
      )
      if (tempcalendars) {
        await refreshCalendars(
          dispatch,
          Object.values(tempcalendars),
          calendarRange,
          'temp'
        )
      }
    }
  }

  const handleDateChange = (date: Date): void => {
    setCurrentDate(date)
  }

  const handleViewChange = (view: string): void => {
    if (!calendarRef.current) return
    dispatch(setView('calendar'))

    calendarRef.current.changeView(view)

    // Notify parent about view change
    setCurrentView(view)

    // Notify parent about date change after view change
    const newDate = calendarRef.current.getDate()
    handleDateChange(newDate)
  }

  // Hide topbar navigation elements when in settings view (same as fullscreen dialog mode)
  useEffect(() => {
    if (view === 'settings') {
      document.body.classList.add('fullscreen-view')
    } else {
      document.body.classList.remove('fullscreen-view')
    }

    // Cleanup on unmount
    return (): void => {
      document.body.classList.remove('fullscreen-view')
    }
  }, [view])

  const menubarProps: MenubarProps = {
    calendarRef,
    onRefresh: () => void handleRefresh(),
    currentDate,
    onDateChange: handleDateChange,
    currentView,
    onViewChange: handleViewChange,
    isIframe: isInIframe,
    onToggleSidebar: () => setOpenSideBar(true)
  }

  return (
    <div className="App">
      {!isInIframe && <Menubar {...menubarProps} />}
      {(view === 'calendar' || view === 'search') && (
        <CalendarApp
          calendarRef={calendarRef}
          onDateChange={handleDateChange}
          onViewChange={handleViewChange}
          menubarProps={menubarProps}
          openSidebar={openSidebar}
          onCloseSidebar={() => setOpenSideBar(false)}
          setCurrentView={setCurrentView}
          currentView={currentView}
        />
      )}
      {view === 'settings' && <SettingsPage isInIframe={isInIframe} />}
      <ErrorSnackbar error={error} type="calendar" />
    </div>
  )
}
