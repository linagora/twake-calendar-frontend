import {
  useCalendarShortcuts,
  OPEN_CALENDAR_SEARCH,
  OPEN_KEYBOARD_SHORTCUTS
} from '@common/hooks/useCalendarShortcuts'
import { navigateCalendar } from '@common/components/Menubar/navigateCalendar'
import { KeyboardShortcutsDialog } from '@common/components/Menubar/KeyboardShortcutsDialog'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import TempSearchDialog from '@common/components/Calendar/TempSearchDialog'
import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { refreshCalendars } from '@common/components/Event/utils/eventUtils'
import { Menubar, MenubarProps } from '@common/components/Menubar/Menubar'
import {
  DisplayedPeriod,
  formatPeriodLabel
} from '@common/components/Menubar/periodLabel'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { MAIN_CONTENT_ID, SkipLink } from '@common/components/SkipLink/SkipLink'
import { visuallyHidden } from '@common/utils/visuallyHidden'
import { Typography } from '@linagora/twake-mui'
import { setIsMobileSearchOpen } from '@common/features/Calendars/CalendarSlice'
import SettingsPage from '@common/features/Settings/SettingsPage'
import { setView } from '@common/features/Settings/SettingsSlice'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { getViewRange } from '@common/utils/dateUtils'
import type { CalendarApi } from '@fullcalendar/core'
import CalendarController, { CalendarControllerRef } from './CalendarController'
import cx from 'classnames'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useManageCalendarSelection } from './hooks/useManageCalendarSelection'
import Sidebar from './Sidebar/SideBar'

export default function CalendarLayout(): JSX.Element {
  const calendarRef = useRef<CalendarApi | null>(null)
  const controllerRef = useRef<CalendarControllerRef | null>(null)
  const dispatch = useAppDispatch()

  const error = useAppSelector(state => state.calendars.error)
  const calendars = useAppSelector(state => state.calendars.list)
  const tempcalendars = useAppSelector(state => state.calendars.templist)
  const view = useAppSelector(state => state.settings.view)
  // The menubar search hands its text over as the keywords
  const searchQuery = useAppSelector(
    state =>
      state.searchResult.searchParams.filters.keywords ||
      state.searchResult.searchParams.search
  )
  const { t } = useI18n()

  const { isTablet, isTooSmall: isMobile } = useScreenSizeDetection()
  const [openSidebar, setOpenSideBar] = useState(false)

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [displayedPeriod, setDisplayedPeriod] = useState<DisplayedPeriod>()
  const [currentView, setCurrentView] = useState<string>(
    isTablet || isMobile
      ? CALENDAR_VIEWS.timeGridDay
      : CALENDAR_VIEWS.timeGridWeek
  )

  const currentViewModeRef = useRef<string>()

  useEffect(() => {
    const setViewMode = (): void => {
      if (currentViewModeRef.current) return
      const storedView =
        isTablet || isMobile
          ? CALENDAR_VIEWS.timeGridDay
          : CALENDAR_VIEWS.timeGridWeek
      setCurrentView(storedView)
      currentViewModeRef.current = storedView
    }

    setViewMode()
  }, [isTablet, isMobile])

  const periodLabel = formatPeriodLabel(displayedPeriod, currentDate, t)
  useDocumentTitle(
    view === 'settings'
      ? t('settings.title')
      : view === 'search'
        ? searchQuery
          ? t('pageTitle.search', { query: searchQuery })
          : t('search.resultsTitle')
        : periodLabel
  )

  // Manage calendar selection states
  const {
    selectedCalendars,
    setSelectedCalendars,
    tempUsers,
    setTempUsers,
    selectedMiniDate,
    setSelectedMiniDate
  } = useManageCalendarSelection()

  const handleRefresh = async (): Promise<void> => {
    if (calendarRef.current) {
      const view = calendarRef.current.view
      const calendarRange = getViewRange(view.currentStart, view.type)

      await refreshCalendars(
        dispatch,
        Object.values(calendars || {}),
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
    dispatch(setView('calendar'))
    setCurrentView(view)

    if (calendarRef.current) {
      const newDate = calendarRef.current.getDate()
      handleDateChange(newDate)
    }
  }

  useEffect(() => {
    if (view === 'settings') {
      document.body.classList.add('fullscreen-view')
    } else {
      document.body.classList.remove('fullscreen-view')
    }

    return (): void => {
      document.body.classList.remove('fullscreen-view')
    }
  }, [view])

  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  useEffect(() => {
    const openHelp = (): void => setShortcutsOpen(true)
    window.addEventListener(OPEN_KEYBOARD_SHORTCUTS, openHelp)
    return () => window.removeEventListener(OPEN_KEYBOARD_SHORTCUTS, openHelp)
  }, [])

  useCalendarShortcuts({
    enabled: view === 'calendar',
    onNavigate: action =>
      navigateCalendar(calendarRef.current, action, handleDateChange),
    onViewChange: handleViewChange,
    onCreate: () => controllerRef.current?.handleCreateEvent(),
    onSearch: () => window.dispatchEvent(new Event(OPEN_CALENDAR_SEARCH)),
    onShowHelp: () => setShortcutsOpen(true)
  })

  const menubarProps: MenubarProps = {
    calendarRef,
    onRefresh: () => void handleRefresh(),
    currentDate,
    displayedPeriod,
    onDateChange: handleDateChange,
    currentView,
    onViewChange: handleViewChange,
    onToggleSidebar: () => setOpenSideBar(true)
  }

  return (
    <div className={cx('App ', { 'App--mobile': isMobile })}>
      <SkipLink />
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      {(view === 'calendar' || view === 'search') && (
        <main className="main-layout calendar-layout">
          {/* Ahead of the sidebar headings, in reading order */}
          {view === 'calendar' && (
            <Typography component="h1" sx={visuallyHidden}>
              {periodLabel}
            </Typography>
          )}
          <Sidebar
            open={openSidebar}
            onClose={() => setOpenSideBar(false)}
            calendarRef={calendarRef}
            onCreateEvent={() => controllerRef.current?.handleCreateEvent()}
            onViewChange={handleViewChange}
            selectedMiniDate={selectedMiniDate}
            setSelectedMiniDate={setSelectedMiniDate}
            selectedCalendars={selectedCalendars}
            setSelectedCalendars={setSelectedCalendars}
            tempUsers={tempUsers}
            setTempUsers={setTempUsers}
            currentView={currentView}
            onDateChange={handleDateChange}
          />
          <div className="calendar" id={MAIN_CONTENT_ID} tabIndex={-1}>
            <Menubar {...menubarProps} />
            <CalendarController
              calendarRef={calendarRef}
              controllerRef={controllerRef}
              currentDate={currentDate}
              currentView={currentView}
              setCurrentView={setCurrentView}
              selectedCalendars={selectedCalendars}
              setSelectedCalendars={setSelectedCalendars}
              tempUsers={tempUsers}
              setTempUsers={setTempUsers}
              selectedMiniDate={selectedMiniDate}
              setSelectedMiniDate={setSelectedMiniDate}
              onDateChange={handleDateChange}
              onPeriodChange={setDisplayedPeriod}
              onViewChange={handleViewChange}
            />
          </div>
          {isMobile && (
            <TempSearchDialog
              tempUsers={tempUsers}
              setTempUsers={setTempUsers}
              onClose={() => {
                dispatch(setIsMobileSearchOpen(false))
                setOpenSideBar(false)
              }}
              handleToggleEventPreview={() =>
                controllerRef.current?.handleCreateEvent()
              }
            />
          )}
        </main>
      )}
      {view === 'settings' && <SettingsPage menubarProps={menubarProps} />}
      <ErrorSnackbar error={error} type="calendar" />
    </div>
  )
}
