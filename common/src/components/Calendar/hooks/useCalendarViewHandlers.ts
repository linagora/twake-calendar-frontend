/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect } from 'react'
import {
  createViewHandlers,
  ViewHandlersProps
} from '@common/components/Calendar/handlers/viewHandlers'
import { CalendarApi, EventInput } from '@fullcalendar/react'
import { getInitialCalendarView } from '../utils/calendarUtils'

export const useSyncCalendarView = (
  view: string | undefined,
  currentView: string | undefined,
  isTablet: boolean,
  calendarRef: React.RefObject<CalendarApi | null>
): void => {
  useEffect(() => {
    if (view !== 'calendar') return
    const calendar = calendarRef.current
    if (!calendar) return

    const targetView = getInitialCalendarView(currentView, isTablet)
    if (calendar.view.type === targetView) return

    const id = requestAnimationFrame(() => {
      const activeCalendar = calendarRef.current
      if (activeCalendar && activeCalendar.view.type !== targetView) {
        activeCalendar.changeView(targetView)
      }
    })
    return (): void => cancelAnimationFrame(id)
  }, [view, isTablet, currentView, calendarRef])
}

export const useWebKitSizeSync = (
  calendarRef: React.RefObject<CalendarApi | null>,
  calendarWrapperRef: React.RefObject<HTMLDivElement | null> | undefined,
  sortedSelectedCalendars: string[] | undefined,
  fullCalendarEvents: EventInput[] | undefined
): void => {
  useEffect(() => {
    const isWebKit =
      typeof navigator !== 'undefined' &&
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (!isWebKit) return

    const api = calendarRef.current
    const wrapper = calendarWrapperRef?.current
    if (!api || !wrapper) return

    const raf = requestAnimationFrame(() => {
      api.updateSize()
      wrapper.style.transform = 'translateZ(0)'
      requestAnimationFrame(() => {
        wrapper.style.transform = ''
      })
    })
    return (): void => cancelAnimationFrame(raf)
  }, [
    sortedSelectedCalendars,
    fullCalendarEvents,
    calendarRef,
    calendarWrapperRef
  ])
}

export const useCalendarViewHandlers = (
  props: ViewHandlersProps
): ReturnType<typeof createViewHandlers> => {
  const viewHandlers = createViewHandlers(props)

  useSyncCalendarView(
    props.view,
    props.currentView,
    props.isTablet,
    props.calendarRef
  )

  useWebKitSizeSync(
    props.calendarRef,
    props.calendarWrapperRef,
    props.sortedSelectedCalendars,
    props.fullCalendarEvents
  )

  return {
    handleDayHeaderContent: useCallback(viewHandlers.handleDayHeaderContent, [
      props.calendarRef,
      props.timezone,
      props.isTablet,
      props.isMobile,
      props.t,
      props.setSelectedDate,
      props.setSelectedMiniDate,
      props.onViewChange
    ]),
    handleDayHeaderDidMount: useCallback(viewHandlers.handleDayHeaderDidMount, [
      props.calendarRef,
      props.setSelectedDate,
      props.setSelectedMiniDate,
      props.onViewChange
    ]),
    handleDayHeaderWillUnmount: useCallback(
      viewHandlers.handleDayHeaderWillUnmount,
      []
    ),
    handleViewDidMount: useCallback(viewHandlers.handleViewDidMount, []),
    handleViewWillUnmount: useCallback(viewHandlers.handleViewWillUnmount, []),
    handleEventContent: useCallback(viewHandlers.handleEventContent, [
      props.calendars,
      props.tempcalendars
    ]),
    handleEventDidMount: useCallback(viewHandlers.handleEventDidMount, [
      props.calendars
    ]),
    handleNowIndicatorContent: useCallback(
      viewHandlers.handleNowIndicatorContent,
      []
    )
  }
}
