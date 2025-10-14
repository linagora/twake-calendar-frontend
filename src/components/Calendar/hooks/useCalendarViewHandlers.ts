import { useCallback } from "react";
import {
  createViewHandlers,
  ViewHandlersProps,
} from "../handlers/viewHandlers";

export const useCalendarViewHandlers = (props: ViewHandlersProps) => {
  const viewHandlers = createViewHandlers(props);

  return {
    handleDayHeaderDidMount: useCallback(viewHandlers.handleDayHeaderDidMount, [
      props.calendarRef,
      props.setSelectedDate,
      props.setSelectedMiniDate,
      props.onViewChange,
    ]),
    handleDayHeaderWillUnmount: useCallback(
      viewHandlers.handleDayHeaderWillUnmount,
      []
    ),
    handleViewDidMount: useCallback(viewHandlers.handleViewDidMount, []),
    handleViewWillUnmount: useCallback(viewHandlers.handleViewWillUnmount, []),
    handleEventContent: useCallback(viewHandlers.handleEventContent, [
      props.calendars,
      props.tempcalendars,
    ]),
    handleEventDidMount: useCallback(viewHandlers.handleEventDidMount, [
      props.calendars,
    ]),
    handleNowIndicatorContent: useCallback(
      viewHandlers.handleNowIndicatorContent,
      []
    ),
  };
};
