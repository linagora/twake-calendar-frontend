import { useCallback } from "react";
import { CalendarApi } from "@fullcalendar/core";
import {
  createEventHandlers,
  EventHandlersProps,
} from "../handlers/eventHandlers";

export const useCalendarEventHandlers = (props: EventHandlersProps) => {
  const eventHandlers = createEventHandlers(props);

  return {
    handleDateSelect: useCallback(eventHandlers.handleDateSelect, [
      props.setSelectedRange,
      props.setAnchorEl,
    ]),
    handleClosePopover: useCallback(eventHandlers.handleClosePopover, [
      props.calendarRef,
      props.setAnchorEl,
      props.setSelectedRange,
      props.selectedCalendars,
      props.tempcalendars,
      props.calendarRange,
      props.dispatch,
    ]),
    handleCloseEventDisplay: useCallback(
      eventHandlers.handleCloseEventDisplay,
      [props.setAnchorPosition, props.setOpenEventDisplay]
    ),
    handleMonthUp: useCallback(eventHandlers.handleMonthUp, []),
    handleMonthDown: useCallback(eventHandlers.handleMonthDown, []),
    handleEventClick: useCallback(eventHandlers.handleEventClick, [
      props.setOpenEventDisplay,
      props.setAnchorPosition,
      props.setEventDisplayedId,
      props.setEventDisplayedCalId,
      props.setEventDisplayedTemp,
    ]),
    handleEventAllow: useCallback(eventHandlers.handleEventAllow, []),
    handleEventDrop: useCallback(eventHandlers.handleEventDrop, [
      props.calendars,
      props.dispatch,
    ]),
    handleEventResize: useCallback(eventHandlers.handleEventResize, [
      props.calendars,
      props.dispatch,
    ]),
  };
};
