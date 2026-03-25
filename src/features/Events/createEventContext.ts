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
  const attendeeEmail = calendar.delegated
    ? calendar.owner?.emails?.[0]
    : user.email;
  const currentUserAttendee = calendar.owner?.resource
    ? event.attendee?.find(
        (person) => person.cutype === "RESOURCE" && person.cn === calendar.name
      )
    : event.attendee?.find((person) => person.cal_address === attendeeEmail);
  const isOrganizer = event.organizer
    ? attendeeEmail === event.organizer.cal_address
    : isOwn;

  return {
    event,
    calendar,
    currentUserAttendee,
    isOwn,
    isRecurring,
    isOrganizer,
  };
}
