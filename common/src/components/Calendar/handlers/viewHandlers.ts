import { EventErrorHandler } from '@common/components/Error/EventErrorHandler'
import { EventChip } from '@common/components/Event/EventChip/EventChip'
import { Calendar } from '@common/types/CalendarTypes'
import { userAttendee } from '@common/features/User/models/attendee'
import { getCalendarOwnerAttendee } from '@common/utils/getCalendarOwnerAttendee'
import {
  allDayDate,
  calendarLabel,
  eventAccessibleLabel
} from '@common/components/Event/utils/eventAccessibleLabel'
import {
  CalendarApi,
  DayHeaderInfo,
  EventDisplayInfo,
  EventInput,
  MountInfo,
  NowIndicatorHeaderInfo,
  ViewDisplayInfo
} from '@fullcalendar/react'
import { endOfDay } from 'date-fns'
import moment from 'moment-timezone'
import React from 'react'
import {
  CALENDAR_VIEWS,
  isListView
} from '@common/components/Calendar/utils/constants'
import { createMouseHandlers } from './mouseHandlers'
import { EventChipSchedule } from '@common/components/Event/EventChip/EventChipSchedule'
import { EventElementSync } from './EventElementSync'

const PARTSTAT_CLASS_MAP: Record<string, string> = {
  DECLINED: 'declined-event',
  TENTATIVE: 'tentative-event',
  'NEEDS-ACTION': 'needs-action-event'
}

export interface ViewHandlersProps {
  calendarRef: React.RefObject<CalendarApi | null>
  setSelectedDate: (date: Date) => void
  setSelectedMiniDate: (date: Date) => void
  onViewChange?: (view: string) => void
  calendars: Record<string, Calendar>
  tempcalendars: Record<string, Calendar>
  errorHandler: EventErrorHandler
  timezone: string
  isTablet: boolean
  isMobile: boolean
  t: (key: string, options?: Record<string, string>) => string
  upcommingEventId?: string
  userId?: string
  currentView?: string
  view?: string
  calendarWrapperRef?: React.RefObject<HTMLDivElement | null>
  sortedSelectedCalendars?: string[]
  fullCalendarEvents?: EventInput[]
}

export interface ViewHandlers {
  handleNowIndicatorContent: (
    arg: NowIndicatorHeaderInfo
  ) => React.ReactElement | undefined
  handleDayHeaderContent: (arg: DayHeaderInfo) => React.JSX.Element
  handleDayHeaderDidMount: (arg: MountInfo<DayHeaderInfo>) => void
  handleDayHeaderWillUnmount: (arg: MountInfo<DayHeaderInfo>) => void
  handleViewDidMount: (arg: MountInfo<ViewDisplayInfo>) => void
  handleViewWillUnmount: (arg: MountInfo<ViewDisplayInfo>) => void
  handleEventClass: (arg: EventDisplayInfo) => string
  handleEventContent: (arg: EventDisplayInfo) => React.ReactElement
  handleEventDidMount: (arg: MountInfo<EventDisplayInfo>) => void
}

export const createViewHandlers = (props: ViewHandlersProps): ViewHandlers => {
  const {
    calendarRef,
    setSelectedDate,
    setSelectedMiniDate,
    onViewChange,
    calendars,
    tempcalendars,
    errorHandler,
    timezone,
    isTablet,
    isMobile,
    t,
    upcommingEventId,
    userId
  } = props

  const handleNowIndicatorContent = ({
    date
  }: NowIndicatorHeaderInfo): React.ReactElement =>
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center' } },
      React.createElement(
        'div',
        { className: 'now-time-label' },
        date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: timezone
        })
      )
    )

  const handleDayHeaderClick = (arg: DayHeaderInfo): void => {
    const startOfDay = new Date(arg.date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfClickedDay = endOfDay(new Date(arg.date))

    calendarRef.current?.select({
      start: startOfDay,
      end: endOfClickedDay,
      allDay: true
    })
  }

  const handleDayNumberClick = (
    e: React.MouseEvent,
    arg: DayHeaderInfo
  ): void => {
    e.stopPropagation()
    calendarRef.current?.changeView(CALENDAR_VIEWS.timeGridDay, arg.date)
    setSelectedDate(new Date(arg.date))
    setSelectedMiniDate(new Date(arg.date))
    if (onViewChange) {
      onViewChange(CALENDAR_VIEWS.timeGridDay)
    }
  }

  const handleDayHeaderContent = (arg: DayHeaderInfo): React.JSX.Element => {
    if (arg.inPopover) return React.createElement('span', null, arg.text)

    const isMonthView = arg.view.type === CALENDAR_VIEWS.dayGridMonth
    const weekDay = (
      isMonthView
        ? arg.date.toLocaleDateString(t('locale'), {
            weekday: 'short',
            timeZone: 'UTC'
          })
        : moment
            .tz(arg.date, timezone)
            .toDate()
            .toLocaleDateString(t('locale'), {
              weekday: 'short',
              timeZone: timezone
            })
    ).toUpperCase()

    return React.createElement(
      'div',
      {
        className: `fc-daygrid-day-top ${isTablet || isMobile ? 'fc-daygrid-day-top--mobile' : ''}`
      },
      React.createElement('small', null, weekDay),
      !isMonthView
        ? React.createElement(
            'span',
            {
              className: `fc-daygrid-day-number ${arg.isToday ? 'current-date' : ''}`,
              onClick: (e: React.MouseEvent) => handleDayNumberClick(e, arg)
            },
            moment.tz(arg.date, timezone).date()
          )
        : null
    )
  }

  interface ClickableHeaderElement extends HTMLElement {
    __dayHeaderClickHandler?: EventListener
  }

  const handleDayHeaderDidMount = (arg: MountInfo<DayHeaderInfo>): void => {
    if (arg.view.type === CALENDAR_VIEWS.timeGridWeek) {
      const headerEl = arg.el as ClickableHeaderElement

      const handleDayClick = (): void => {
        handleDayHeaderClick(arg)
      }

      headerEl.addEventListener('click', handleDayClick)
      headerEl.__dayHeaderClickHandler = handleDayClick
    }
  }

  const handleDayHeaderWillUnmount = (arg: MountInfo<DayHeaderInfo>): void => {
    const headerEl = arg.el as ClickableHeaderElement
    if (headerEl.__dayHeaderClickHandler) {
      headerEl.removeEventListener('click', headerEl.__dayHeaderClickHandler)
      delete headerEl.__dayHeaderClickHandler
    }
  }

  const handleViewDidMount = (arg: MountInfo<ViewDisplayInfo>): void => {
    if (
      arg.view.type === CALENDAR_VIEWS.timeGridWeek ||
      arg.view.type === CALENDAR_VIEWS.timeGridDay
    ) {
      const calendarEl = arg.el.closest<HTMLElement>('.fc')
      if (calendarEl) {
        const mouseHandlers = createMouseHandlers({ calendarEl })
        mouseHandlers.addMouseEventListeners()
      }
    }
  }

  const handleViewWillUnmount = (arg: MountInfo<ViewDisplayInfo>): void => {
    const el = arg.el as HTMLElement & {
      __timeInterval?: ReturnType<typeof setInterval>
      __timeObserver?: { disconnect: () => void }
    }

    if (el.__timeInterval !== undefined) {
      clearInterval(el.__timeInterval)
      delete el.__timeInterval
    }

    if (el.__timeObserver !== undefined) {
      el.__timeObserver.disconnect()
      delete el.__timeObserver
    }

    const calendarEl = arg.el.closest<HTMLElement>('.fc')
    if (calendarEl) {
      const mouseHandlers = createMouseHandlers({ calendarEl })
      mouseHandlers.removeMouseEventListeners()
    }
  }

  const eventDetails = (
    event: EventDisplayInfo['event']
  ): { calendar?: Calendar; partstat?: string } => {
    const extendedProps = event.extendedProps as {
      attendee?: userAttendee[]
      organizer?: { cal_address?: string }
      calId: string
    }
    return {
      calendar:
        calendars[extendedProps.calId] ?? tempcalendars[extendedProps.calId],
      partstat: getCalendarOwnerAttendee(
        calendars[extendedProps.calId],
        extendedProps.attendee,
        extendedProps.organizer
      )?.partstat
    }
  }

  // Re-evaluated by FullCalendar on every render, unlike eventDidMount
  const handleEventClass = ({ event }: EventDisplayInfo): string => {
    const { partstat } = eventDetails(event)
    return (partstat && PARTSTAT_CLASS_MAP[partstat]) ?? ''
  }

  const syncEventElement = (el: HTMLElement, arg: EventDisplayInfo): void => {
    if (arg.event.id) {
      el.setAttribute('data-event-id', arg.event.id)
    }

    // FullCalendar already opens a focused event on Enter and Space
    if (isListView(arg.view.type) || el.tabIndex !== 0 || !arg.event.start) {
      return
    }

    const { calendar, partstat } = eventDetails(arg.event)
    const { allDay, startStr, endStr } = arg.event
    el.setAttribute('role', 'button')
    el.setAttribute(
      'aria-label',
      eventAccessibleLabel({
        title: arg.event.title,
        start: allDay ? allDayDate(startStr) : arg.event.start,
        end: allDay ? (endStr ? allDayDate(endStr) : null) : arg.event.end,
        allDay,
        calendarName: calendarLabel(calendar, userId, t),
        partstat,
        timeZone: timezone,
        t
      })
    )
  }

  const eventChip = (arg: EventDisplayInfo): React.ReactElement =>
    isListView(arg.view.type)
      ? React.createElement(EventChipSchedule, {
          arg,
          calendars,
          tempcalendars,
          timezone,
          upcommingEventId
        })
      : React.createElement(EventChip, {
          arg,
          calendars,
          tempcalendars,
          errorHandler
        })

  // An answer or a move re-renders the content without remounting the element
  const handleEventContent = (arg: EventDisplayInfo): React.ReactElement =>
    React.createElement(
      EventElementSync,
      { sync: (el: HTMLElement) => syncEventElement(el, arg) },
      eventChip(arg)
    )

  const handleEventDidMount = (arg: MountInfo<EventDisplayInfo>): void =>
    syncEventElement(arg.el, arg)

  return {
    handleNowIndicatorContent,
    handleDayHeaderContent,
    handleDayHeaderDidMount,
    handleDayHeaderWillUnmount,
    handleViewDidMount,
    handleViewWillUnmount,
    handleEventClass,
    handleEventContent,
    handleEventDidMount
  }
}
