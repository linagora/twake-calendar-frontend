import {
  getEventAsync,
  putEventAsync,
  updateEventInstanceAsync,
  updateSeriesAsync,
} from "@/features/Calendars/services";
import { CalendarApi, DateSelectArg, EventDropArg } from "@fullcalendar/core";
import { EventResizeDoneArg } from "@fullcalendar/interaction";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { getEvent } from "@/features/Events/EventApi";
import { CalendarEvent } from "@/features/Events/EventsTypes";
import { userAttendee } from "@/features/User/models/attendee";
import { createAttendee } from "@/features/User/models/attendee.mapper";
import { getDeltaInMilliseconds } from "@/utils/dateUtils";
import { User } from "../../Attendees/PeopleSearch";
import { formatLocalDateTime } from "../../Event/utils/dateTimeFormatters";

export interface EventHandlersProps {
  setSelectedRange: (range: DateSelectArg | null) => void;
  setAnchorEl: (el: HTMLElement | null) => void;
  calendarRef: React.RefObject<CalendarApi | null>;
  selectedCalendars: string[];
  tempcalendars: Record<string, Calendar>;
  calendarRange: { start: Date; end: Date };
  dispatch: any;
  setOpenEventDisplay: (open: boolean) => void;
  setEventDisplayedId: (id: string) => void;
  setEventDisplayedCalId: (id: string) => void;
  setEventDisplayedTemp: (temp: boolean) => void;
  calendars: Record<string, Calendar>;
  setSelectedEvent: (event: CalendarEvent) => void;
  setAfterChoiceFunc: (func: Function) => void;
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

  const handleClosePopover = (refresh?: boolean) => {
    calendarRef.current?.unselect();
    setAnchorEl(null);
    setSelectedRange(null);
    if (refresh) {
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
    }
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
                  sequence: (master.sequence ?? 1) + 1,
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
                  sequence: (master.sequence ?? 1) + 1,
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

export const updateAttendeesAfterTimeChange = (
  event: CalendarEvent,
  timeChanged?: boolean,
  attendees?: userAttendee[]
): CalendarEvent => {
  const { attendee, organizer } = event;
  if (!attendee || !organizer) return event;

  const organizerAddr = organizer.cal_address;

  const markNeedsAction = (att: userAttendee): userAttendee => ({
    ...att,
    partstat: "NEEDS-ACTION",
    rsvp: "TRUE",
  });

  const getExistingOrDefault = (addr: string, fallback: userAttendee) =>
    attendee.find((a) => a?.cal_address === addr) ?? fallback;

  if (attendees) {
    const updatedAttendees = attendees.map((att) => {
      const existing = getExistingOrDefault(
        att.cal_address,
        markNeedsAction(att)
      );
      return timeChanged ? markNeedsAction(existing) : existing;
    });

    const organizerEntry = getExistingOrDefault(organizerAddr, {
      ...organizer,
      role: "CHAIR",
      cutype: "INDIVIDUAL",
      partstat: "NEEDS-ACTION",
      rsvp: "TRUE",
    });

    return {
      ...event,
      attendee: [...updatedAttendees, organizerEntry],
    };
  }
  const updatedAttendees = attendee.map((att) => {
    if (att.cal_address === organizerAddr) return att;
    return timeChanged ? markNeedsAction(att) : att;
  });

  return {
    ...event,
    attendee: updatedAttendees,
  };
};
