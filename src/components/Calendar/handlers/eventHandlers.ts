import { DateSelectArg } from "@fullcalendar/core";
import { CalendarApi } from "@fullcalendar/core";
import { CalendarEvent } from "../../../features/Events/EventsTypes";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { getDeltaInMilliseconds } from "../../../utils/dateUtils";
import {
  getCalendarDetailAsync,
  putEventAsync,
  updateEventInstanceAsync,
  updateEventLocal,
  updateSeriesAsync,
} from "../../../features/Calendars/CalendarSlice";
import { formatDateToYYYYMMDDTHHMMSS } from "../../../utils/dateUtils";
import { getEvent } from "../../../features/Events/EventApi";
import { refreshCalendars } from "../../Event/utils/eventUtils";
import { updateTempCalendar } from "../utils/calendarUtils";

export interface EventHandlersProps {
  setSelectedRange: (range: DateSelectArg | null) => void;
  setAnchorEl: (el: HTMLElement | null) => void;
  calendarRef: React.RefObject<CalendarApi | null>;
  selectedCalendars: string[];
  tempcalendars: Record<string, Calendars>;
  calendarRange: { start: Date; end: Date };
  dispatch: any;
  setOpenEventDisplay: (open: boolean) => void;
  setEventDisplayedId: (id: string) => void;
  setEventDisplayedCalId: (id: string) => void;
  setEventDisplayedTemp: (temp: boolean) => void;
  calendars: Record<string, Calendars>;
  setSelectedEvent: (event: CalendarEvent) => void;
  setAfterChoiceFunc: (func: Function) => void;
  setOpenEditModePopup: (open: string) => void;
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
    setEventDisplayedId,
    setEventDisplayedCalId,
    setEventDisplayedTemp,
    calendars,
    setSelectedEvent,
    setAfterChoiceFunc,
    setOpenEditModePopup,
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
    setOpenEventDisplay(false);
  };

  const handleEventClick = (info: any) => {
    info.jsEvent.preventDefault();

    if (info.event.url) {
      window.open(info.event.url);
    } else {
      setOpenEventDisplay(true);
      setEventDisplayedId(info.event.extendedProps.uid);
      setEventDisplayedCalId(info.event.extendedProps.calId);
      setEventDisplayedTemp(info.event._def.extendedProps.temp);
    }
  };

  const handleEventAllow = (dropInfo: any, draggedEvent: any) => {
    return true;
  };

  const handleEventDrop = async (arg: any) => {
    if (!arg.event || !arg.event._def || !arg.event._def.extendedProps) {
      return;
    }

    const event =
      calendars[arg.event._def.extendedProps.calId].events[
        arg.event._def.extendedProps.uid
      ];
    const calendar = calendars[arg.event._def.extendedProps.calId];

    const isRecurring = event.uid.includes("/");
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

    if (isRecurring) {
      setSelectedEvent(event);
      setOpenEditModePopup("edit");
      setAfterChoiceFunc(
        () => async (typeOfAction: "solo" | "all" | undefined) => {
          if (typeOfAction === "solo") {
            await dispatch(
              updateEventInstanceAsync({ cal: calendar, event: newEvent })
            );
            dispatch(
              updateEventLocal({ calId: newEvent.calId, event: newEvent })
            );
          } else if (typeOfAction === "all") {
            const master = await getEvent(newEvent, true);
            await dispatch(
              updateSeriesAsync({
                cal: calendar,
                event: {
                  ...master,
                  start: computedNewStart.toISOString(),
                  end: computedNewEnd.toISOString(),
                },
              })
            );
            await refreshCalendars(
              dispatch,
              Object.values(calendars),
              calendarRange
            );
            await updateTempCalendar(
              tempcalendars,
              event,
              dispatch,
              calendarRange
            );
          }
        }
      );
    } else {
      dispatch(updateEventLocal({ calId: newEvent.calId, event: newEvent }));
      await dispatch(
        putEventAsync({ cal: calendars[newEvent.calId], newEvent })
      );
    }
    await updateTempCalendar(tempcalendars, event, dispatch, calendarRange);
  };

  const handleEventResize = async (arg: any) => {
    if (!arg.event || !arg.event._def || !arg.event._def.extendedProps) {
      return;
    }

    const event =
      calendars[arg.event._def.extendedProps.calId].events[
        arg.event._def.extendedProps.uid
      ];
    const calendar = calendars[arg.event._def.extendedProps.calId];

    const isRecurring = event.uid.includes("/");

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

    if (isRecurring) {
      setSelectedEvent(event);
      setOpenEditModePopup("edit");
      setAfterChoiceFunc(
        () => async (typeOfAction: "solo" | "all" | undefined) => {
          if (typeOfAction === "solo") {
            await dispatch(
              updateEventInstanceAsync({ cal: calendar, event: newEvent })
            );
            dispatch(
              updateEventLocal({ calId: newEvent.calId, event: newEvent })
            );
          } else if (typeOfAction === "all") {
            const master = await getEvent(newEvent, true);

            await dispatch(
              updateSeriesAsync({
                cal: calendar,
                event: {
                  ...master,
                  start: computedNewStart.toISOString(),
                  end: computedNewEnd.toISOString(),
                },
              })
            );
            await refreshCalendars(
              dispatch,
              Object.values(calendars),
              calendarRange
            );
            await updateTempCalendar(
              tempcalendars,
              event,
              dispatch,
              calendarRange
            );
          }
        }
      );
    } else {
      await dispatch(
        putEventAsync({ cal: calendars[newEvent.calId], newEvent })
      );
    }
    await updateTempCalendar(tempcalendars, event, dispatch, calendarRange);
  };

  return {
    handleDateSelect,
    handleClosePopover,
    handleCloseEventDisplay,
    handleEventClick,
    handleEventAllow,
    handleEventDrop,
    handleEventResize,
  };
};
