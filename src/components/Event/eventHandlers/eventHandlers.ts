import { ThunkDispatch } from "@reduxjs/toolkit";
import {
  updateEventInstanceAsync,
  putEventAsync,
  deleteEventInstanceAsync,
  deleteEventAsync,
} from "../../../features/Calendars/CalendarSlice";
import { Calendar } from "../../../features/Calendars/CalendarTypes";
import { updateSeriesPartstat } from "../../../features/Events/EventApi";
import { CalendarEvent } from "../../../features/Events/EventsTypes";
import { PartStat } from "../../../features/User/models/attendee";
import { createAttendee } from "../../../features/User/models/attendee.mapper";
import { userData } from "../../../features/User/userDataTypes";
import { buildFamilyName } from "../../../utils/buildFamilyName";
import { getCalendarRange } from "../../../utils/dateUtils";
import { refreshCalendars } from "../utils/eventUtils";

function updateEventAttendees(
  event: CalendarEvent,
  user: userData | undefined,
  rsvp: PartStat
) {
  if (!user) {
    throw new Error("Cannot update attendees without user data");
  }

  const eventHasNoAttendees = !event?.attendee || event.attendee.length === 0;
  const isOrganizer =
    !event.organizer ||
    event.organizer.cal_address?.toLowerCase() === user.email?.toLowerCase();
  if (eventHasNoAttendees) {
    const userdata = createAttendee({
      cal_address: user.email,
      cn: buildFamilyName(user.given_name, user.family_name, user.email),
      role: isOrganizer ? "CHAIR" : "REQ-PARTICIPANT",
      partstat: rsvp,
    });
    return {
      organizer: isOrganizer ? userdata : event.organizer,
      attendee: [userdata],
    };
  }

  return {
    attendee: (() => {
      const userEmailLower = user.email?.toLowerCase();
      const userExists = event.attendee.some(
        (a) => a.cal_address?.toLowerCase() === userEmailLower
      );

      const updatedAttendees = event.attendee.map((attendeeData) =>
        attendeeData.cal_address?.toLowerCase() === userEmailLower
          ? { ...attendeeData, partstat: rsvp }
          : attendeeData
      );

      if (!userExists) {
        const newUserAttendee = createAttendee({
          cal_address: user.email,
          cn: buildFamilyName(user.given_name, user.family_name, user.email),
          role: "REQ-PARTICIPANT",
          partstat: rsvp,
        });
        return [...updatedAttendees, newUserAttendee];
      }

      return updatedAttendees;
    })(),
  };
}

async function handleSoloRSVP(
  dispatch: ThunkDispatch<any, any, any>,
  calendar: Calendar,
  event: CalendarEvent
) {
  dispatch(updateEventInstanceAsync({ cal: calendar, event }));
}

async function handleAllRSVP(
  dispatch: ThunkDispatch<any, any, any>,
  event: CalendarEvent,
  userEmail: string,
  rsvp: PartStat,
  calendars: Calendar[]
) {
  const calendarRange = getCalendarRange(new Date(event.start));
  await updateSeriesPartstat(event, userEmail, rsvp);
  await refreshCalendars(dispatch, calendars, calendarRange);
}

async function handleDefaultRSVP(
  dispatch: ThunkDispatch<any, any, any>,
  calendar: Calendar,
  newEvent: CalendarEvent
) {
  dispatch(putEventAsync({ cal: calendar, newEvent }));
}

export async function handleRSVP(
  dispatch: ThunkDispatch<any, any, any>,
  calendar: Calendar,
  user: userData | undefined,
  event: CalendarEvent,
  rsvp: PartStat,
  typeOfAction?: string,
  calendars?: Calendar[]
) {
  const newEvent = {
    ...event,
    ...updateEventAttendees(event, user, rsvp),
  };

  if (typeOfAction === "solo") {
    await handleSoloRSVP(dispatch, calendar, newEvent);
  } else if (typeOfAction === "all") {
    if (!calendars || calendars.length === 0) {
      throw new Error("Cannot update all occurrences without calendar list");
    }
    if (!user?.email) {
      throw new Error("Cannot update all occurrences without user email");
    }
    await handleAllRSVP(dispatch, event, user.email, rsvp, calendars);
  } else {
    await handleDefaultRSVP(dispatch, calendar, newEvent);
  }
}

export function handleDelete(
  isRecurring: boolean,
  typeOfAction: "solo" | "all" | undefined,
  onClose: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void,
  dispatch: Function,
  calendar: Calendar,
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
