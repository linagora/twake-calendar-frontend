import { ThunkDispatch } from "@reduxjs/toolkit";
import {
  updateEventInstanceAsync,
  putEventAsync,
  deleteEventInstanceAsync,
  deleteEventAsync,
} from "../../../features/Calendars/CalendarSlice";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { updateSeriesPartstat } from "../../../features/Events/EventApi";
import { CalendarEvent } from "../../../features/Events/EventsTypes";
import { createAttendeeFromUserData } from "../../../features/User/models/attendee.mapper";
import { userData } from "../../../features/User/userDataTypes";
import { getCalendarRange } from "../../../utils/dateUtils";
import { refreshCalendars } from "../utils/eventUtils";

function updateEventAttendees(
  event: CalendarEvent,
  user: userData,
  rsvp: string
) {
  const eventHasNoAttendees = !event?.attendee || event.attendee.length === 0;
  if (eventHasNoAttendees) {
    const userdata = createAttendeeFromUserData(user, {
      role: "CHAIR",
      partstat: rsvp,
    });
    return {
      organizer: userdata,
      attendee: [userdata],
    };
  }

  return {
    attendee: event.attendee.map((attendeeData) =>
      attendeeData.cal_address === user.email
        ? { ...attendeeData, partstat: rsvp }
        : attendeeData
    ),
  };
}

export async function handleRSVP(
  dispatch: ThunkDispatch<any, any, any>,
  calendar: Calendars,
  user: userData,
  event: CalendarEvent,
  rsvp: string,
  typeOfAction?: string,
  calendars?: Calendars[]
) {
  const newEvent = {
    ...event,
    ...updateEventAttendees(event, user, rsvp),
  };

  if (typeOfAction === "solo") {
    dispatch(updateEventInstanceAsync({ cal: calendar, event: newEvent }));
  } else if (typeOfAction === "all") {
    const calendarRange = getCalendarRange(new Date(event.start));

    // Update PARTSTAT on ALL VEVENTs (master + exceptions)
    await updateSeriesPartstat(event, user.email, rsvp);

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
