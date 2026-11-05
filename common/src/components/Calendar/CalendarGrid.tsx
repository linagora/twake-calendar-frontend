import React, { useState, useCallback } from 'react'
import cx from 'classnames'
import type { MutableRefObject, RefObject } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import classicTheme from '@fullcalendar/react/themes/classic'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/theme.css'
import '@fullcalendar/react/themes/classic/palette.css'
import listPlugin from '@fullcalendar/react/list'
import frLocale from '@fullcalendar/react/locales/fr'
import esLocale from '@fullcalendar/react/locales/es'
import deLocale from '@fullcalendar/react/locales/de'
import itLocale from '@fullcalendar/react/locales/it'
import ruLocale from '@fullcalendar/react/locales/ru'
import viLocale from '@fullcalendar/react/locales/vi'
import type {
  CalendarApi,
  LocaleInput,
  MoreLinkHandler,
  EventApi,
  DateSelectInfo,
  EventClickInfo,
  EventDropInfo,
  EventResizeDoneInfo,
  DatesSetInfo
} from '@fullcalendar/react'
import {
  updateSlotLabelVisibility,
  sortEventsByDateTime,
  getInitialCalendarView
} from './utils/calendarUtils'
import { CALENDAR_VIEWS, isListView } from './utils/constants'
import { NoEventsContent } from './NoEventsContent'
import { WeekNumberContent } from './WeekNumberContent'
import { DayCellContent } from './DayCellContent'
import { MoreLinkContent } from './MoreLinkContent'
import { EventErrorHandler } from '@common/components/Error/EventErrorHandler'
import { useCalendarGridState } from './hooks/useCalendarGridState'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import { useI18n } from 'twake-i18n'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import { useAutoScrollToUpcommingEvent } from '../Event/hooks/useAutoScrollToUpcommingEvent'
import { usePreserveScrollPositionInScheduleView } from './hooks/usePreserveScrollPositionInScheduleView'
import { useDraftEvent } from './hooks/useDraftEvent'
import { BookingLinkOverlay } from './BookingLinkOverlay'
import type { BookingLink } from '@common/features/booking/types/BookingTypes'

const localeMap: Record<string, LocaleInput | undefined> = {
  fr: frLocale,
  es: esLocale,
  de: deLocale,
  it: itLocale,
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
    handleDateSelect: (selectInfo: DateSelectInfo | null) => void
    handleEventClick: (info: EventClickInfo) => void
    handleEventAllow: () => boolean
    handleEventDrop: (arg: EventDropInfo) => Promise<void>
    handleEventResize: (arg: EventResizeDoneInfo) => Promise<void>
  }
  displayWeekNumbers: boolean
  handleMoreLinkClick: MoreLinkHandler
  datesSet: (arg: DatesSetInfo) => void
  openEventDisplay: boolean
  visibleBookingLinks?: string[]
  selectedRange?: DateSelectInfo | null
  draftCalendarId?: string | null
  onEditBookingLink?: (link: BookingLink) => void
}

const CALENDAR_PLUGINS = [
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
  classicTheme,
  listPlugin
]

const CALENDAR_DEFAULT_PROPS = {
  firstDay: 1,
  editable: true,
  selectable: true,
  selectMirror: true,
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
  slotHeaderInterval: '01:00:00',
  scrollTimeReset: false,
  unselectAuto: false,
  allDayText: '',
  slotHeaderFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  plugins: CALENDAR_PLUGINS
} as const

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarRef,
  calendarWrapperRef,
  datesSet,
  ...otherProps
}) => {
  const { lang } = useI18n()
  const { isTooSmall: isMobile, isTablet } = useScreenSizeDetection()
  const isNotDesktop = isTablet || isMobile

  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(
    null
  )

  const handleDatesSet = useCallback(
    (arg: DatesSetInfo) => {
      setDateRange({ start: arg.start, end: arg.end })
      datesSet(arg)
    },
    [datesSet]
  )

  const { isPending, filteredCalendarEvents, viewHandlers, upcomingEventId } =
    useCalendarGridState({
      calendarRef,
      calendarWrapperRef,
      currentView: otherProps.currentView,
      timezone: otherProps.timezone,
      selectedCalendars: otherProps.selectedCalendars,
      setSelectedDate: otherProps.setSelectedDate,
      setSelectedMiniDate: otherProps.setSelectedMiniDate,
      onViewChange: otherProps.onViewChange,
      errorHandler: otherProps.errorHandler,
      visibleBookingLinks: otherProps.visibleBookingLinks,
      rangeStart: dateRange?.start,
      rangeEnd: dateRange?.end
    })

  const { events } = useDraftEvent({
    selectedRange: otherProps.selectedRange,
    draftCalendarId: otherProps.draftCalendarId,
    filteredCalendarEvents
  })

  const { handlers: swipeHandlers } = useSwipeNavigation(
    calendarRef,
    calendarWrapperRef
  )

  useAutoScrollToUpcommingEvent(upcomingEventId)

  usePreserveScrollPositionInScheduleView(
    otherProps.openEventDisplay,
    otherProps.currentView
  )

  return (
    <>
      <div
        ref={calendarWrapperRef}
        className={cx('fc', {
          'calendar-swipe-container': isNotDesktop,
          'hide-selection-highlight': !!otherProps.selectedRange
        })}
        style={{
          height: '100%',
          ...(isNotDesktop ? { touchAction: 'pan-y' } : {})
        }}
        {...(isNotDesktop ? swipeHandlers : {})}
      >
        <BookingLinkOverlay
          visibleBookingLinks={otherProps.visibleBookingLinks}
          calendarRef={calendarRef}
          timezone={otherProps.timezone}
          currentView={otherProps.currentView}
          onEditBookingLink={otherProps.onEditBookingLink}
        />
        <FullCalendar
          {...CALENDAR_DEFAULT_PROPS}
          key={otherProps.hiddenDays.join(',')}
          ref={ref => {
            calendarRef.current = ref ? ref.getApi() : null
          }}
          initialView={getInitialCalendarView(otherProps.currentView, isTablet)}
          initialDate={otherProps.selectedDate}
          locale={localeMap[lang]}
          hiddenDays={otherProps.hiddenDays}
          timeZone={otherProps.timezone}
          select={otherProps.eventHandlers.handleDateSelect}
          viewClass={({ view }) =>
            cx('fc-view-harness', `fc-${view.type}-view`, {
              'calendar-list-view': isListView(view.type)
            })
          }
          tableBodyClass={() =>
            otherProps.currentView === CALENDAR_VIEWS.dayGridMonth
              ? 'fc-daygrid-body'
              : 'fc-timegrid-body'
          }
          dayHeaderClass={({ inPopover, isToday }) =>
            inPopover
              ? 'fc-popover-header'
              : cx('fc-col-header-cell fc-day', { 'fc-day-today': isToday })
          }
          dayHeaderInnerClass={({ inPopover }) =>
            inPopover ? 'fc-popover-title' : 'fc-col-header-cell-cushion'
          }
          dayCellClass={({ isToday }) =>
            cx('fc-daygrid-day', { 'fc-day-today': isToday })
          }
          dayCellInnerClass={({ inPopover }) =>
            inPopover ? 'fc-popover-body' : 'fc-daygrid-day-frame'
          }
          dayLaneClass={({ isToday }) =>
            cx('fc-timegrid-col', { 'fc-day-today': isToday })
          }
          slotLaneClass="fc-timegrid-slot calendar-time-lane"
          slotHeaderClass={arg =>
            cx(
              'fc-timegrid-slot fc-timegrid-slot-label',
              updateSlotLabelVisibility(new Date(), arg, otherProps.timezone)
            )
          }
          slotHeaderInnerClass="fc-timegrid-slot-label-cushion fc-timegrid-slot-label-frame"
          nowIndicatorHeaderClass="fc-timegrid-now-indicator-arrow"
          nowIndicatorLineClass="fc-timegrid-now-indicator-line"
          allDayHeaderInnerClass="fc-timegrid-axis-cushion"
          listDaysClass="fc-list"
          listDayHeaderClass="fc-list-day"
          noEventsClass="fc-list-empty"
          eventClass={({ isSelected }) =>
            cx('fc-event', { 'fc-event-selected': isSelected })
          }
          columnEventClass="fc-timegrid-event"
          columnEventBeforeClass={({ isStartResizable }) =>
            isStartResizable ? 'fc-event-resizer-start' : ''
          }
          columnEventAfterClass={({ isEndResizable }) =>
            isEndResizable ? 'fc-event-resizer-end' : ''
          }
          listItemEventClass="fc-list-event"
          listItemEventTimeClass="fc-list-event-time"
          listItemEventBeforeClass="fc-list-event-graphic"
          eventInnerClass="fc-event-main"
          popoverClass="fc-popover fc-more-popover"
          popoverCloseClass="fc-popover-close"
          moreLinkClass="fc-daygrid-more-link"
          highlightClass="fc-highlight"
          nowIndicatorHeaderContent={viewHandlers.handleNowIndicatorContent}
          noEventsContent={() => (
            <NoEventsContent
              isPending={isPending}
              period={dateRange}
              timezone={otherProps.timezone}
            />
          )}
          moreLinkClick={otherProps.handleMoreLinkClick}
          moreLinkContent={arg => (
            <MoreLinkContent
              text={arg.longText}
              shortText={arg.numericText}
              isCompact={isMobile}
            />
          )}
          events={events}
          eventOrder={(a: unknown, b: unknown) =>
            sortEventsByDateTime(a as EventApi, b as EventApi)
          }
          weekNumbers={
            otherProps.currentView === CALENDAR_VIEWS.timeGridWeek ||
            otherProps.currentView === CALENDAR_VIEWS.timeGridDay
          }
          weekNumberHeaderContent={arg => (
            <WeekNumberContent
              num={arg.num ?? 0}
              displayWeekNumbers={otherProps.displayWeekNumbers}
              timezone={otherProps.timezone}
              selectedDate={otherProps.selectedDate}
            />
          )}
          dayCellTopContent={arg => (
            <DayCellContent
              date={arg.date}
              view={arg.view}
              isToday={arg.isToday}
              dayNumberText={arg.dayNumberText}
              timezone={otherProps.timezone}
            />
          )}
          datesSet={handleDatesSet}
          dayHeaderContent={viewHandlers.handleDayHeaderContent}
          dayHeaderDidMount={viewHandlers.handleDayHeaderDidMount}
          dayHeaderWillUnmount={viewHandlers.handleDayHeaderWillUnmount}
          viewDidMount={viewHandlers.handleViewDidMount}
          viewWillUnmount={viewHandlers.handleViewWillUnmount}
          eventClick={otherProps.eventHandlers.handleEventClick}
          eventAllow={otherProps.eventHandlers.handleEventAllow}
          eventDrop={arg => {
            void otherProps.eventHandlers.handleEventDrop(arg)
          }}
          eventResize={arg => {
            void otherProps.eventHandlers.handleEventResize(arg)
          }}
          eventContent={viewHandlers.handleEventContent}
          eventDidMount={viewHandlers.handleEventDidMount}
        />
      </div>
    </>
  )
}
