import { DateSelectArg } from "@fullcalendar/core";
import { CalendarApi } from "@fullcalendar/core";
import { CalendarEvent } from "../../../features/Events/EventsTypes";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { getDeltaInMilliseconds } from "../../../utils/dateUtils";
import {
  getCalendarDetailAsync,
  getEventAsync,
  putEventAsync,
  updateEventLocal,
} from "../../../features/Calendars/CalendarSlice";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../utils/dateUtils";

export interface EventHandlersProps {
  setSelectedRange: (range: DateSelectArg | null) => void;
  setAnchorEl: (el: HTMLElement | null) => void;
  calendarRef: React.RefObject<CalendarApi | null>;
  selectedCalendars: string[];
  tempcalendars: Record<string, Calendars>;
  calendarRange: { start: Date; end: Date };
  dispatch: any;
  setOpenEventDisplay: (open: boolean) => void;
  setAnchorPosition: (position: { top: number; left: number } | null) => void;
  setEventDisplayedId: (id: string) => void;
  setEventDisplayedCalId: (id: string) => void;
  setEventDisplayedTemp: (temp: boolean) => void;
  calendars: Record<string, Calendars>;
}

export const createEventHandlers = (props: EventHandlersProps) => {
  const {
    setSelectedRange,
    setAnchorEl,
    calendarRef,
    selectedCalendars,
    tempcalendars,
    calendarRange,
    dispatch,
    setOpenEventDisplay,
    setAnchorPosition,
    setEventDisplayedId,
    setEventDisplayedCalId,
    setEventDisplayedTemp,
    calendars,
  } = props;

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedRange(selectInfo);
    setAnchorEl(document.body);
  };

  const handleClosePopover = () => {
    calendarRef.current?.unselect();
    setAnchorEl(null);
    setSelectedRange(null);
    selectedCalendars.forEach((calId) =>
      dispatch(
        getCalendarDetailAsync({
          calId,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
          },
        })
      )
    );
    Object.keys(tempcalendars).forEach((calId) =>
      dispatch(
        getCalendarDetailAsync({
          calId,
          match: {
            start: formatDateToYYYYMMDDTHHMMSS(calendarRange.start),
            end: formatDateToYYYYMMDDTHHMMSS(calendarRange.end),
          },
          calType: "temp",
        })
      )
    );
  };

  const handleCloseEventDisplay = () => {
    setAnchorPosition(null);
    setOpenEventDisplay(false);
  };

  const handleMonthUp = (
    selectedMiniDate: Date,
    setSelectedMiniDate: (date: Date) => void
  ) => {
    setSelectedMiniDate(
      new Date(selectedMiniDate.getFullYear(), selectedMiniDate.getMonth() - 1)
    );
  };

  const handleMonthDown = (
    selectedMiniDate: Date,
    setSelectedMiniDate: (date: Date) => void
  ) => {
    setSelectedMiniDate(
      new Date(selectedMiniDate.getFullYear(), selectedMiniDate.getMonth() + 1)
    );
  };

  const handleEventClick = (info: any) => {
    info.jsEvent.preventDefault();

    if (info.event.url) {
      window.open(info.event.url);
    } else {
      console.log(info.event);
      setOpenEventDisplay(true);
      setAnchorPosition({
        top: info.jsEvent.clientY,
        left: info.jsEvent.clientX,
      });
      setEventDisplayedId(info.event.extendedProps.uid);
      setEventDisplayedCalId(info.event.extendedProps.calId);
      setEventDisplayedTemp(info.event._def.extendedProps.temp);
    }
  };

  const handleEventAllow = (dropInfo: any, draggedEvent: any) => {
    if (
      draggedEvent?.extendedProps.uid &&
      draggedEvent.extendedProps.uid.split("/")[1]
    ) {
      return false;
    }
    return true;
  };

  const handleEventDrop = (arg: any) => {
    if (!arg.event || !arg.event._def || !arg.event._def.extendedProps) {
      return;
    }

    const event =
      calendars[arg.event._def.extendedProps.calId].events[
        arg.event._def.extendedProps.uid
      ];

    const totalDeltaMs = getDeltaInMilliseconds(arg.delta);

    const originalStart = new Date(event.start);
    const computedNewStart = new Date(originalStart.getTime() + totalDeltaMs);
    const originalEnd = new Date(event.end ?? "");
    const computedNewEnd = new Date(originalEnd.getTime() + totalDeltaMs);
    const newEvent = {
      ...event,
      start: computedNewStart.toISOString(),
      end: computedNewEnd.toISOString(),
    } as CalendarEvent;
    dispatch(updateEventLocal({ calId: newEvent.calId, event: newEvent }));
    dispatch(putEventAsync({ cal: calendars[newEvent.calId], newEvent }));
  };

  const handleEventResize = (arg: any) => {
    if (!arg.event || !arg.event._def || !arg.event._def.extendedProps) {
      return;
    }

    const event =
      calendars[arg.event._def.extendedProps.calId].events[
        arg.event._def.extendedProps.uid
      ];
    if (event.uid.split("/")[1]) {
      dispatch(getEventAsync(event));
    }
    const originalStart = new Date(event.start);
    const computedNewStart = new Date(
      originalStart.getTime() + getDeltaInMilliseconds(arg.startDelta)
    );
    const originalEnd = new Date(event.end ?? "");
    const computedNewEnd = new Date(
      originalEnd.getTime() + getDeltaInMilliseconds(arg.endDelta)
    );
    const newEvent = {
      ...event,
      start: computedNewStart.toISOString(),
      end: computedNewEnd.toISOString(),
    } as CalendarEvent;

    dispatch(putEventAsync({ cal: calendars[newEvent.calId], newEvent }));
  };

  return {
    handleDateSelect,
    handleClosePopover,
    handleCloseEventDisplay,
    handleMonthUp,
    handleMonthDown,
    handleEventClick,
    handleEventAllow,
    handleEventDrop,
    handleEventResize,
  };
};
