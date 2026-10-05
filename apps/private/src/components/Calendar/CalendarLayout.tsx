import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import TempSearchDialog from '@common/components/Calendar/TempSearchDialog'
import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { refreshCalendars } from '@common/components/Event/utils/eventUtils'
import { Menubar, MenubarProps } from '@common/components/Menubar/Menubar'
import { DisplayedPeriod } from '@common/components/Menubar/periodLabel'
import { useIsInIframe } from '@common/contexts/EmbeddingContext'
import { setIsMobileSearchOpen } from '@common/features/Calendars/CalendarSlice'
import SettingsPage from '@common/features/Settings/SettingsPage'
import { setView } from '@common/features/Settings/SettingsSlice'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { VisuallyHidden } from '@common/components/VisuallyHidden'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { getViewRange } from '@common/utils/dateUtils'
import type { CalendarApi } from '@fullcalendar/core'
import CalendarController, { CalendarControllerRef } from './CalendarController'
import cx from 'classnames'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useManageCalendarSelection } from './hooks/useManageCalendarSelection'
import Sidebar from './Sidebar/SideBar'
import { MAIN_CONTENT_ID, SkipLink } from '@common/components/SkipLink'

const VIEW_NAME_KEYS: Record<string, string> = {
  [CALENDAR_VIEWS.dayGridMonth]: 'menubar.views.month',
  [CALENDAR_VIEWS.timeGridWeek]: 'menubar.views.week',
  [CALENDAR_VIEWS.timeGridDay]: 'menubar.views.day',
  [CALENDAR_VIEWS.listWeek]: 'menubar.views.schedule'
}

export default function CalendarLayout(): JSX.Element {
  const calendarRef = useRef<CalendarApi | null>(null)
  const controllerRef = useRef<CalendarControllerRef | null>(null)
  const dispatch = useAppDispatch()
  const { t } = useI18n()

  const error = useAppSelector(state => state.calendars.error)
  const calendars = useAppSelector(state => state.calendars.list)
  const tempcalendars = useAppSelector(state => state.calendars.templist)
  const view = useAppSelector(state => state.settings.view)

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
  // The period shown by the grid, as FullCalendar words it in the user locale
  const [periodTitle, setPeriodTitle] = useState<string>()

  const viewNameKey = VIEW_NAME_KEYS[currentView]
  const calendarHeading = [periodTitle, viewNameKey && t(viewNameKey)]
    .filter(Boolean)
    .join(' – ')
  useDocumentTitle(
    ...(view === 'settings'
      ? [t('settings.title')]
      : view === 'search'
        ? [t('search.resultsTitle')]
        : [calendarHeading])
  )

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

  const isInIframe = useIsInIframe()

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

  const menubarProps: MenubarProps = {
    calendarRef,
    onRefresh: () => void handleRefresh(),
    currentDate,
    displayedPeriod,
    onDateChange: handleDateChange,
    currentView,
    onViewChange: handleViewChange,
    isIframe: isInIframe,
    onToggleSidebar: () => setOpenSideBar(true)
  }

  return (
    <div className={cx('App ', { 'App--mobile': isMobile })}>
      <SkipLink />
      {!isInIframe && <Menubar {...menubarProps} />}
      {(view === 'calendar' || view === 'search') && (
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className={cx('main-layout calendar-layout', {
            isInIframe: isInIframe,
            'calendar-layout--desktop': !isMobile
          })}
        >
          {view === 'calendar' && (
            <VisuallyHidden component="h1">
              {calendarHeading || t('a11y.calendar')}
            </VisuallyHidden>
          )}
          <Sidebar
            open={openSidebar}
            onClose={() => setOpenSideBar(false)}
            calendarRef={calendarRef}
            isIframe={isInIframe}
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
          <div className="calendar">
            {isInIframe && <Menubar {...menubarProps} />}
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
              onPeriodTitleChange={setPeriodTitle}
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
      {view === 'settings' && (
        <SettingsPage menubarProps={menubarProps} isInIframe={isInIframe} />
      )}
      <ErrorSnackbar error={error} type="calendar" />
    </div>
  )
}
