import React from 'react'
import type { MutableRefObject, RefObject } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, {
  EventResizeDoneArg
} from '@fullcalendar/interaction'
import momentTimezonePlugin from '@fullcalendar/moment-timezone'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import ruLocale from '@fullcalendar/core/locales/ru'
import viLocale from '@fullcalendar/core/locales/vi'
import type {
  CalendarApi,
  LocaleInput,
  MoreLinkArg,
  EventApi,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  DatesSetArg
} from '@fullcalendar/core'
import {
  updateSlotLabelVisibility,
  sortEventsByDateTime,
  getInitialCalendarView
} from './utils/calendarUtils'
import { CALENDAR_VIEWS } from './utils/constants'
import { NoEventsContent } from './NoEventsContent'
import { WeekNumberContent } from './WeekNumberContent'
import { DayCellContent } from './DayCellContent'
import { EventErrorHandler } from '@common/components/Error/EventErrorHandler'
import { useCalendarGridState } from './hooks/useCalendarGridState'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { useI18n } from 'twake-i18n'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import { useAutoScrollToUpcommingEvent } from '../Event/hooks/useAutoScrollToUpcommingEvent'
import { usePreserveScrollPositionInScheduleView } from './hooks/usePreserveScrollPositionInScheduleView'

const localeMap: Record<string, LocaleInput | undefined> = {
  fr: frLocale,
  ru: ruLocale,
  vi: viLocale,
  en: undefined
}

export interface CalendarGridProps {
  calendarRef: MutableRefObject<CalendarApi | null>
  calendarWrapperRef: RefObject<HTMLDivElement>
  hiddenDays: number[]
  currentView: string
  selectedDate: Date
  timezone: string
  selectedCalendars: string[]
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>
  setSelectedMiniDate: (date: Date) => void
  onViewChange: (view: string) => void
  errorHandler: EventErrorHandler
  eventHandlers: {
    handleDateSelect: (selectInfo: DateSelectArg | null) => void
    handleEventClick: (info: EventClickArg) => void
    handleEventAllow: () => boolean
    handleEventDrop: (arg: EventDropArg) => Promise<void>
    handleEventResize: (arg: EventResizeDoneArg) => Promise<void>
  }
  displayWeekNumbers: boolean
  handleMoreLinkClick: (arg: MoreLinkArg) => string | void
  datesSet: (arg: DatesSetArg) => void
  openEventDisplay: boolean
  visibleBookingLinks?: string[]
}

const CALENDAR_PLUGINS = [
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
  momentTimezonePlugin,
  listPlugin
]

const CALENDAR_DEFAULT_PROPS = {
  firstDay: 1,
  editable: true,
  selectable: true,
  height: '100%',
  nowIndicator: true,
  noEventsText: '',
  headerToolbar: false,
  views: {
    timeGridWeek: {
      titleFormat: { month: 'long', year: 'numeric' }
    }
  },
  dayMaxEvents: true,
  weekNumberFormat: { week: 'long' },
  slotDuration: '00:30:00',
  slotLabelInterval: '01:00:00',
  scrollTimeReset: false,
  unselectAuto: false,
  allDayText: '',
  slotLabelFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  plugins: CALENDAR_PLUGINS
} as const

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarRef,
  calendarWrapperRef,
  hiddenDays,
  currentView,
  selectedDate,
  timezone,
  selectedCalendars,
  setSelectedDate,
  setSelectedMiniDate,
  onViewChange,
  errorHandler,
  eventHandlers,
  displayWeekNumbers,
  handleMoreLinkClick,
  datesSet,
  openEventDisplay,
  visibleBookingLinks
}) => {
  const { lang } = useI18n()
  const { isTooSmall: isMobile, isTablet } = useScreenSizeDetection()
  const isNotDesktop = isTablet || isMobile

  const { isPending, filteredCalendarEvents, viewHandlers, upcomingEventId } =
    useCalendarGridState({
      calendarRef,
      calendarWrapperRef,
      currentView,
      timezone,
      selectedCalendars,
      setSelectedDate,
      setSelectedMiniDate,
      onViewChange,
      errorHandler,
      visibleBookingLinks
    })

  const { handlers: swipeHandlers } = useSwipeNavigation(
    calendarRef,
    calendarWrapperRef
  )

  useAutoScrollToUpcommingEvent(upcomingEventId)

  usePreserveScrollPositionInScheduleView(openEventDisplay, currentView)

  return (
    <>
      <div
        ref={calendarWrapperRef}
        className={isNotDesktop ? 'calendar-swipe-container' : ''}
        style={{
          height: '100%',
          ...(isNotDesktop ? { touchAction: 'pan-y' } : {})
        }}
        {...(isNotDesktop ? swipeHandlers : {})}
      >
        <FullCalendar
          {...CALENDAR_DEFAULT_PROPS}
          key={hiddenDays.join(',')}
          ref={ref => {
            calendarRef.current = ref ? ref.getApi() : null
          }}
          initialView={getInitialCalendarView(currentView, isTablet)}
          initialDate={selectedDate}
          locale={localeMap[lang]}
          hiddenDays={hiddenDays}
          timeZone={timezone}
          select={eventHandlers.handleDateSelect}
          slotLabelClassNames={arg => [
            updateSlotLabelVisibility(new Date(), arg, timezone)
          ]}
          nowIndicatorContent={viewHandlers.handleNowIndicatorContent}
          noEventsContent={() => <NoEventsContent isPending={isPending} />}
          moreLinkClick={handleMoreLinkClick}
          events={filteredCalendarEvents}
          eventOrder={(a: unknown, b: unknown) =>
            sortEventsByDateTime(a as EventApi, b as EventApi)
          }
          weekNumbers={
            currentView === CALENDAR_VIEWS.timeGridWeek ||
            currentView === CALENDAR_VIEWS.timeGridDay
          }
          weekNumberContent={arg => (
            <WeekNumberContent
              num={arg.num}
              displayWeekNumbers={displayWeekNumbers}
              timezone={timezone}
              selectedDate={selectedDate}
            />
          )}
          dayCellContent={arg => (
            <DayCellContent
              date={arg.date}
              view={arg.view}
              isToday={arg.isToday}
              dayNumberText={arg.dayNumberText}
              timezone={timezone}
            />
          )}
          datesSet={datesSet}
          dayHeaderContent={viewHandlers.handleDayHeaderContent}
          dayHeaderDidMount={viewHandlers.handleDayHeaderDidMount}
          dayHeaderWillUnmount={viewHandlers.handleDayHeaderWillUnmount}
          viewDidMount={viewHandlers.handleViewDidMount}
          viewWillUnmount={viewHandlers.handleViewWillUnmount}
          eventClick={eventHandlers.handleEventClick}
          eventAllow={eventHandlers.handleEventAllow}
          eventDrop={arg => {
            void eventHandlers.handleEventDrop(arg)
          }}
          eventResize={arg => {
            void eventHandlers.handleEventResize(arg)
          }}
          eventContent={viewHandlers.handleEventContent}
          eventDidMount={viewHandlers.handleEventDidMount}
        />
      </div>
    </>
  )
}
