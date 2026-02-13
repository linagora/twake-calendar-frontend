import { Calendar } from "../Calendars/CalendarTypes";
import { userData } from "../User/userDataTypes";
import { CalendarEvent, ContextualizedEvent } from "./EventsTypes";
import { buildDelegatedEventURL } from "./eventUtils";

export function createEventContext(
  event: CalendarEvent,
  calendar: Calendar,
  user: userData
): ContextualizedEvent {
  const isOwn = calendar.owner?.emails?.includes(user.email) ?? false;
  const isRecurring = event?.uid?.includes("/") ?? false;
  const isOrganizer = event.organizer
    ? user?.email === event.organizer.cal_address
    : isOwn;
  const attendeeEmail = calendar.delegated
    ? calendar.owner?.emails?.[0]
    : user.email;
  const eventURL = calendar.delegated
    ? buildDelegatedEventURL(calendar, event)
    : event.URL;
  const currentUserAttendee = event.attendee?.find(
    (a) => a.cal_address === attendeeEmail
  );

  return {
    event: { ...event, URL: eventURL },
    calendar,
    currentUserAttendee,
    isOwn,
    isRecurring,
    isOrganizer,
  };
}
