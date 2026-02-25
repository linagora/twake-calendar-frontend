import { AppDispatch } from "@/app/store";
import { User } from "@/components/Attendees/PeopleSearch";
import { formatLocalDateTime } from "@/components/Event/utils/dateTimeFormatters";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import {
  getEventAsync,
  putEventAsync,
  updateEventInstanceAsync,
  updateSeriesAsync,
} from "@/features/Calendars/services";
import { getEvent } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { updateAttendeesAfterTimeChange } from "@/features/Events/updateEventHelpers/updateAttendeesAfterTimeChange";
import { createAttendee } from "@/features/User/models/attendee.mapper";
import { getDeltaInMilliseconds } from "@/utils/dateUtils";
import {
  CalendarApi,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import { EventResizeDoneArg } from "@fullcalendar/interaction";

export interface EventHandlersProps {
  setSelectedRange: (range: DateSelectArg | null) => void;
  setAnchorEl: (el: HTMLElement | null) => void;
  calendarRef: React.RefObject<CalendarApi | null>;
  dispatch: AppDispatch;
  setOpenEventDisplay: (open: boolean) => void;
  setEventDisplayedId: (id: string) => void;
  setEventDisplayedCalId: (id: string) => void;
  setEventDisplayedTemp: (temp: boolean) => void;
  calendars: Record<string, Calendar>;
  setSelectedEvent: (event: CalendarEvent) => void;
  setAfterChoiceFunc: (
    func: ((type: "solo" | "all" | undefined) => void) | undefined
  ) => void;
  setOpenEditModePopup: (open: string) => void;
  tempUsers: User[];
  setTempEvent: (event: CalendarEvent) => void;
  timezone: string;
}

export const createEventHandlers = (props: EventHandlersProps) => {
  const {
    setSelectedRange,
    setAnchorEl,
    calendarRef,
    dispatch,
    setOpenEventDisplay,
    setEventDisplayedId,
    setEventDisplayedCalId,
    setEventDisplayedTemp,
    calendars,
    setSelectedEvent,
    setAfterChoiceFunc,
    setOpenEditModePopup,
    tempUsers,
    setTempEvent,
    timezone,
  } = props;

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedRange(selectInfo);
    if (tempUsers) {
      const newEvent: CalendarEvent = {
        start: selectInfo?.start
          ? formatLocalDateTime(selectInfo?.start, timezone)
          : "",
        end: selectInfo?.end
          ? formatLocalDateTime(selectInfo?.end, timezone)
          : "",
        attendee: tempUsers.map((user) =>
          createAttendee({
            cal_address: user.email,
            cn: user.displayName,
            rsvp: "TRUE",
          })
        ),
      } as CalendarEvent;

      setTempEvent(newEvent);
    }
    setAnchorEl(document.body);
  };

  const handleClosePopover = () => {
    calendarRef.current?.unselect();
    setAnchorEl(null);
    setSelectedRange(null);
  };

  const handleCloseEventDisplay = () => {
    setOpenEventDisplay(false);
  };

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();

    if (info.event.url) {
      window.open(info.event.url);
    } else {
      setOpenEventDisplay(true);
      if (
        calendars[info.event.extendedProps.calId] &&
        calendars[info.event.extendedProps.calId].events[
          info.event.extendedProps.uid
        ]
      ) {
        dispatch(
          getEventAsync(
            calendars[info.event.extendedProps.calId].events[
              info.event.extendedProps.uid
            ]
          )
        );
      }

      setEventDisplayedId(info.event.extendedProps.uid);
      setEventDisplayedCalId(info.event.extendedProps.calId);
      setEventDisplayedTemp(info.event._def.extendedProps.temp);
    }
  };

  const handleEventAllow = () => {
    return true;
  };

  const handleEventDrop = async (arg: EventDropArg) => {
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
    const newEvent = updateAttendeesAfterTimeChange(
      {
        ...event,
        start: computedNewStart.toISOString(),
        end: computedNewEnd.toISOString(),
        sequence: (event.sequence ?? 1) + 1,
      } as CalendarEvent,
      true
    );
    if (isRecurring) {
      setSelectedEvent(event);
      setOpenEditModePopup("edit");
      setAfterChoiceFunc(
        () => async (typeOfAction: "solo" | "all" | undefined) => {
          if (typeOfAction === "solo") {
            await dispatch(
              updateEventInstanceAsync({ cal: calendar, event: newEvent })
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
                  sequence: (master.sequence ?? 1) + 1,
                },
              })
            );
          }
        }
      );
    } else {
      await dispatch(
        putEventAsync({ cal: calendars[newEvent.calId], newEvent })
      );
    }
  };

  const handleEventResize = async (arg: EventResizeDoneArg) => {
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
    const newEvent = updateAttendeesAfterTimeChange(
      {
        ...event,
        start: computedNewStart.toISOString(),
        end: computedNewEnd.toISOString(),
        sequence: (event.sequence ?? 1) + 1,
      } as CalendarEvent,
      true
    );
    if (isRecurring) {
      setSelectedEvent(event);
      setOpenEditModePopup("edit");
      setAfterChoiceFunc(
        () => async (typeOfAction: "solo" | "all" | undefined) => {
          if (typeOfAction === "solo") {
            await dispatch(
              updateEventInstanceAsync({ cal: calendar, event: newEvent })
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
                  sequence: (master.sequence ?? 1) + 1,
                },
              })
            );
          }
        }
      );
    } else {
      await dispatch(
        putEventAsync({ cal: calendars[newEvent.calId], newEvent })
      );
    }
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
