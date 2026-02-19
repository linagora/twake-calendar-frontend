import { Calendar } from "../Calendars/CalendarTypes";
import { userData } from "../User/userDataTypes";
import { CalendarEvent, ContextualizedEvent } from "./EventsTypes";

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
  const currentUserAttendee = event.attendee?.find(
    (person) => person.cal_address === attendeeEmail
  );
  return {
    event,
    calendar,
    currentUserAttendee,
    isOwn,
    isRecurring,
    isOrganizer,
  };
}
