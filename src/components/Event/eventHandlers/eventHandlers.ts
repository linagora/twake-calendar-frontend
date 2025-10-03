import {
  updateEventInstanceAsync,
  updateSeriesAsync,
  putEventAsync,
  deleteEventInstanceAsync,
  deleteEventAsync,
} from "../../../features/Calendars/CalendarSlice";
import { Calendars } from "../../../features/Calendars/CalendarTypes";
import { getEvent } from "../../../features/Events/EventApi";
import { CalendarEvent } from "../../../features/Events/EventsTypes";
import { userAttendee, userData } from "../../../features/User/userDataTypes";

export async function handleRSVP(
  dispatch: Function,
  calendar: Calendars,
  user: { userData: userData },
  event: CalendarEvent,
  rsvp: string,
  onClose?: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void,
  typeOfAction?: string
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
    const master = await getEvent(newEvent, true);

    dispatch(
      updateSeriesAsync({
        cal: calendar,
        event: {
          ...master,
          attendee: event.attendee?.map((a) =>
            a.cal_address === user.userData.email ? { ...a, partstat: rsvp } : a
          ),
        },
      })
    );
  } else {
    dispatch(putEventAsync({ cal: calendar, newEvent }));
  }
  onClose && onClose({}, "backdropClick");
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
