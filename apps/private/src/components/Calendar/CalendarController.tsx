import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import EventPopover from '@common/features/Events/EventModal'
import EventPreviewModal from '@common/components/EventPreview'
import { CalendarEvent } from '@common/types/EventsTypes'
import SearchResultsPage from '@common/features/Search/SearchResultsPage'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { setDisplayedDateAndRange } from '@common/utils/CalendarRangeManager'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import type {
  DatesSetArg,
  EventApi,
  MoreLinkArg,
  SlotLabelContentArg
} from '@fullcalendar/core'
import { CalendarApi, DateSelectArg } from '@fullcalendar/core'
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useCalendarDataLoader } from '@common/features/Calendars/useCalendarLoader'
import { User } from '@common/components/Attendees/types'
import { EventErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { EventErrorHandler } from '@common/components/Error/EventErrorHandler'
import { EditModeDialog } from '@common/components/Event/EditModeDialog'
import { Fab } from '@linagora/twake-mui'
import Tooltip from '@common/components/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import './Calendar.styl'
import './CustomCalendar.styl'
import { useCalendarEventHandlers } from '@common/components/Calendar/hooks/useCalendarEventHandlers'
import { useOpenEventFromUrl } from '@common/components/Calendar/hooks/useOpenEventFromUrl'
import { useOpenNewEventFromUrl } from '@common/components/Calendar/hooks/useOpenNewEventFromUrl'
import { useHiddenDays } from '@common/components/Calendar/hooks/useCalendarControllerHooks'
import { useTouchListener } from '@common/components/Calendar/hooks/useTouchListener'
import { updateSlotLabelVisibility } from '@common/components/Calendar/utils/calendarUtils'
import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'
import ViewMoreEvents from '@common/components/Calendar/ViewMoreEvents'
import { CalendarGrid } from '@common/components/Calendar/CalendarGrid'
import ImportAlert from '@common/features/Events/ImportAlert'
import { TimezoneChangeAlert } from '@common/components/Timezone/TimezoneChangeAlert'
import { useVisibleBookingLinks } from './hooks/useVisibleBookingLinks'
import dayjs from 'dayjs'

export interface CalendarControllerRef {
  handleCreateEvent: () => void
}

export interface CalendarControllerProps {
  calendarRef: MutableRefObject<CalendarApi | null>
  currentDate: Date
  currentView: string
  setCurrentView: (view: string) => void
  selectedCalendars: string[]
  setSelectedCalendars: (calendars: string[]) => void
  tempUsers: User[]
  setTempUsers: (users: User[]) => void
  selectedMiniDate: Date | null
  setSelectedMiniDate: (date: Date) => void
  onDateChange?: (date: Date) => void
  onViewChange: (view: string) => void
  controllerRef?: MutableRefObject<CalendarControllerRef | null>
}

const getCalendarIds = (calendarIdsString: string): string[] => {
  return calendarIdsString ? calendarIdsString.split(',') : []
}

const CalendarController: React.FC<CalendarControllerProps> = ({
  calendarRef,
  currentView,
  setCurrentView,
  selectedCalendars,
  tempUsers,
  setSelectedMiniDate,
  onDateChange,
  onViewChange,
  controllerRef
}: CalendarControllerProps) => {
  const { t } = useI18n()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [debouncedDate, setDebouncedDate] = useState(new Date())
  useEffect(() => {
    const t = setTimeout(() => setDebouncedDate(selectedDate), 300)
    return (): void => clearTimeout(t)
  }, [selectedDate])

  const calendarWrapperRef = useRef<HTMLDivElement>(null)
  const dispatch = useAppDispatch()
  const view = useAppSelector(state => state.settings.view)
  const workingDays: number[] | undefined = useAppSelector(
    state => state.settings.businessHours?.daysOfWeek
  )

  const visibleBookingLinks = useVisibleBookingLinks()

  const hideWorkingDays = useAppSelector(state =>
    Boolean(state.settings.workingDays)
  )

  const { isTablet, isTooSmall: isMobile } = useScreenSizeDetection()

  const hiddenDays = useHiddenDays(hideWorkingDays, workingDays)

  const calendars = useAppSelector(state => state.calendars.list)
  const userId = useAppSelector(state => state.user.userData?.openpaasId) ?? ''
  const displayWeekNumbers = useAppSelector(
    state => state.settings.displayWeekNumbers
  )
  const tempcalendars = useAppSelector(state => state.calendars.templist)

  const calendarIdsString = useMemo(
    () =>
      Object.keys(calendars || {})
        .sort()
        .join(','),
    [calendars]
  )
  const calendarIds = useMemo(
    () => getCalendarIds(calendarIdsString),
    [calendarIdsString]
  )

  const timezone =
    useAppSelector(state => state.settings.timeZone) ?? browserDefaultTimeZone

  const [eventErrors, setEventErrors] = useState<string[]>([])
  const errorHandler = useMemo(() => new EventErrorHandler(), [])

  useEffect(() => {
    const handler = errorHandler
    handler.setErrorCallback(setEventErrors)
    return (): void => handler.setErrorCallback(() => {})
  }, [errorHandler])

  const handleErrorClose = (): void => {
    setEventErrors([])
    errorHandler.clearAll()
  }

  const sortedSelectedCalendars = useMemo(
    () => [...selectedCalendars].sort(),
    [selectedCalendars]
  )

  const tempCalendarIdsString = useMemo(
    () =>
      Object.keys(tempcalendars || {})
        .sort()
        .join(','),
    [tempcalendars]
  )
  const tempCalendarIds = useMemo(
    () => getCalendarIds(tempCalendarIdsString),
    [tempCalendarIdsString]
  )

  useCalendarDataLoader({
    selectedDate: debouncedDate,
    currentView,
    selectedCalendars,
    sortedSelectedCalendars,
    calendarIds,
    calendarIdsString,
    tempCalendarIds
  })

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [openEventDisplay, setOpenEventDisplay] = useState(false)
  const [eventDisplayedId, setEventDisplayedId] = useState('')
  const [eventDisplayedTemp, setEventDisplayedTemp] = useState(false)
  const [eventDisplayedCalId, setEventDisplayedCalId] = useState('')

  const [openEditModePopup, setOpenEditModePopup] = useState<string | null>(
    null
  )
  const [, setTypeOfAction] = useState<'solo' | 'all' | undefined>(undefined)
  const [afterChoiceFunc, setAfterChoiceFunc] = useState<
    ((type: 'solo' | 'all' | undefined) => void) | undefined
  >()
  const [, setSelectedEvent] = useState<CalendarEvent>({} as CalendarEvent)
  const [selectedRange, setSelectedRange] = useState<DateSelectArg | null>(null)
  const [draftCalendarId, setDraftCalendarId] = useState<string | null>(null)

  const [tempEvent, setTempEvent] = useState<CalendarEvent>({} as CalendarEvent)

  const [isMoreEventsDrawerOpen, setIsMoreEventsDrawerOpen] = useState(false)
  const [moreEvents, setMoreEvents] = useState<EventApi[]>([])

  const handleMoreLinkClick = (arg: MoreLinkArg): string | void => {
    if (!isMobile) return

    setMoreEvents(arg.hiddenSegs.map(seg => seg.event))
    setIsMoreEventsDrawerOpen(true)

    return 'none'
  }

  // Event handlers
  const eventHandlers = useCalendarEventHandlers({
    setSelectedRange,
    setAnchorEl,
    calendarRef,
    dispatch,
    setOpenEventDisplay,
    openEventDisplay,
    setEventDisplayedId,
    eventDisplayedId,
    setEventDisplayedCalId,
    eventDisplayedCalId,
    setEventDisplayedTemp,
    calendars,
    setSelectedEvent,
    setAfterChoiceFunc,
    setOpenEditModePopup,
    tempUsers,
    setTempEvent,
    timezone
  })

  // Open the event preview modal when arriving from a /events/:uid deep link.
  useOpenEventFromUrl({
    userId,
    calendars,
    dispatch,
    setEventDisplayedId,
    setEventDisplayedCalId,
    setEventDisplayedTemp,
    setOpenEventDisplay
  })

  // Open the create event modal with prefilled attendee(s) when arriving from a
  // /newEvent?attendee=xxx@yyy.com deep link.
  useOpenNewEventFromUrl({
    userId,
    calendars,
    setTempEvent,
    setAnchorEl
  })

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      window.__calendarRef = calendarRef
    }
    return (): void => {
      if (process.env.NODE_ENV === 'test') {
        window.__calendarRef = undefined
      }
    }
  }, [calendarRef])

  useTouchListener(
    eventHandlers.handleDateSelect,
    isTablet || isMobile,
    calendarWrapperRef
  )

  // Expose handleCreateEvent through controllerRef
  useEffect(() => {
    if (controllerRef) {
      controllerRef.current = {
        handleCreateEvent: (): void => {
          eventHandlers.handleDateSelect(null)
        }
      }
    }
    return (): void => {
      if (controllerRef) {
        controllerRef.current = null
      }
    }
  }, [controllerRef, eventHandlers])

  const datesSet = (arg: DatesSetArg): void => {
    onViewChange?.(arg.view.type)
    const calendarCurrentDate =
      calendarRef.current?.getDate() || new Date(arg.start)
    setDisplayedDateAndRange(calendarCurrentDate)
    const today = new Date()

    if (arg.view.type === CALENDAR_VIEWS.dayGridMonth) {
      const start = new Date(arg.start).getTime()
      const end = new Date(arg.end).getTime()
      const middle = start + (end - start) / 2
      setSelectedDate(new Date(middle))
      const todayIsInCurrentMonth = dayjs(today).isSame(
        dayjs(arg.start),
        'month'
      )
      setSelectedMiniDate(todayIsInCurrentMonth ? today : calendarCurrentDate)
    } else {
      setSelectedDate(calendarCurrentDate)
      const todayIsInCurrentWeek = dayjs(today).isSame(dayjs(arg.start), 'week')
      setSelectedMiniDate(todayIsInCurrentWeek ? today : calendarCurrentDate)
    }

    if (onDateChange) {
      onDateChange(calendarCurrentDate)
    }

    setCurrentView(arg.view.type)

    setTimeout(() => {
      updateSlotLabelVisibility(new Date(), {} as SlotLabelContentArg, timezone)
    }, 100)
  }

  return (
    <>
      <TimezoneChangeAlert />
      <ImportAlert />
      {(isTablet || isMobile) && (
        <Tooltip title={t('tooltip.createEvent')}>
          <Fab
            color="primary"
            aria-label={t('event.createEvent')}
            onClick={() => eventHandlers.handleDateSelect(null)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 20,
              borderRadius: '16px'
            }}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      )}
      {view === 'calendar' && (
        <CalendarGrid
          calendarRef={calendarRef}
          calendarWrapperRef={calendarWrapperRef}
          hiddenDays={hiddenDays}
          currentView={currentView}
          selectedDate={selectedDate}
          timezone={timezone}
          selectedCalendars={selectedCalendars}
          setSelectedDate={setSelectedDate}
          setSelectedMiniDate={setSelectedMiniDate}
          onViewChange={setCurrentView}
          errorHandler={errorHandler}
          eventHandlers={eventHandlers}
          displayWeekNumbers={displayWeekNumbers}
          handleMoreLinkClick={handleMoreLinkClick}
          datesSet={datesSet}
          openEventDisplay={openEventDisplay}
          visibleBookingLinks={visibleBookingLinks}
          selectedRange={selectedRange}
          draftCalendarId={draftCalendarId}
        />
      )}
      {view === 'search' && <SearchResultsPage />}
      <EventPopover
        open={Boolean(anchorEl)}
        onClose={eventHandlers.handleClosePopover}
        selectedRange={selectedRange}
        setSelectedRange={setSelectedRange}
        setDraftCalendarId={setDraftCalendarId}
        calendarRef={calendarRef}
        event={tempEvent}
      />
      <EditModeDialog
        type={openEditModePopup}
        setOpen={setOpenEditModePopup}
        eventAction={(type: 'solo' | 'all' | undefined) => {
          setTypeOfAction(type)
          if (afterChoiceFunc) {
            afterChoiceFunc(type)
          }
        }}
      />
      {openEventDisplay && eventDisplayedId && eventDisplayedCalId && (
        <EventPreviewModal
          eventId={eventDisplayedId}
          calId={eventDisplayedCalId}
          tempEvent={eventDisplayedTemp}
          open={openEventDisplay}
          onClose={eventHandlers.handleCloseEventDisplay}
        />
      )}
      <EventErrorSnackbar messages={eventErrors} onClose={handleErrorClose} />

      {isMobile && (
        <ViewMoreEvents
          isOpen={isMoreEventsDrawerOpen}
          onOpen={() => setIsMoreEventsDrawerOpen(true)}
          onClose={() => setIsMoreEventsDrawerOpen(false)}
          moreEvents={moreEvents}
          handleEventClick={eventHandlers.handleEventClick}
        />
      )}
    </>
  )
}

export default CalendarController
