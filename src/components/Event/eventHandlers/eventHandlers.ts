import { ThunkDispatch } from "@reduxjs/toolkit";
import { useAppSelector } from "../../../app/hooks";
import {
  updateEventInstanceAsync,
  updateSeriesAsync,
  putEventAsync,
  deleteEventInstanceAsync,
  deleteEventAsync,
} from "../../../features/Calendars/CalendarSlice";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import {
  getEvent,
  updateSeriesPartstat,
} from "../../../features/Events/EventApi";
import { CalendarEvent } from "../../../features/Events/EventsTypes";
import { userData } from "../../../features/User/userDataTypes";
import { getCalendarRange } from "../../../utils/dateUtils";
import { refreshCalendars } from "../utils/eventUtils";

export async function handleRSVP(
  dispatch: ThunkDispatch<any, any, any>,
  calendar: Calendars,
  user: { userData: userData },
  event: CalendarEvent,
  rsvp: string,
  onClose?: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void,
  typeOfAction?: string,
  calendars?: Calendars[]
) {
  const newEvent = {
    ...event,
    attendee: event.attendee?.map((a) =>
      a.cal_address === user.userData.email ? { ...a, partstat: rsvp } : a
    ),
  };
  if (typeOfAction === "solo") {
    dispatch(updateEventInstanceAsync({ cal: calendar, event: newEvent }));
  } else if (typeOfAction === "all") {
    const calendarRange = getCalendarRange(new Date(event.start));

    // Update PARTSTAT on ALL VEVENTs (master + exceptions)
    await updateSeriesPartstat(event, user.userData.email, rsvp);

    if (calendars) {
      await refreshCalendars(dispatch, calendars, calendarRange);
    }
  } else {
    dispatch(putEventAsync({ cal: calendar, newEvent }));
  }
}

export function handleDelete(
  isRecurring: boolean,
  typeOfAction: "solo" | "all" | undefined,
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void,
  dispatch: Function,
  calendar: Calendars,
  event: CalendarEvent,
  calId: string,
  eventId: string
) {
  if (isRecurring) {
    onClose({}, "backdropClick");
    if (typeOfAction === "solo") {
      dispatch(deleteEventInstanceAsync({ cal: calendar, event }));
    } else {
      dispatch(
        deleteEventAsync({
          calId,
          eventId,
          eventURL: event.URL,
        })
      );
    }
  } else {
    onClose({}, "backdropClick");
    dispatch(
      deleteEventAsync({
        calId,
        eventId,
        eventURL: event.URL,
      })
    );
  }
}
