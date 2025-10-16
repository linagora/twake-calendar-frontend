import { useCallback } from "react";
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
      [props.setOpenEventDisplay]
    ),
    handleEventClick: useCallback(eventHandlers.handleEventClick, [
      props.setOpenEventDisplay,
      props.setEventDisplayedId,
      props.setEventDisplayedCalId,
      props.setEventDisplayedTemp,
    ]),
    handleEventAllow: useCallback(eventHandlers.handleEventAllow, []),
    handleEventDrop: useCallback(eventHandlers.handleEventDrop, [
      props.calendars,
      props.dispatch,
      props.setSelectedEvent,
      props.setOpenEditModePopup,
      props.setAfterChoiceFunc,
    ]),
    handleEventResize: useCallback(eventHandlers.handleEventResize, [
      props.calendars,
      props.dispatch,
    ]),
  };
};
