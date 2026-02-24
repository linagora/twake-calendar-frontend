import { userAttendee } from "@/features/User/models/attendee";
import { CalendarEvent } from "../EventsTypes";

export const updateAttendeesAfterTimeChange = (
  event: CalendarEvent,
  timeChanged?: boolean,
  attendees?: userAttendee[]
): CalendarEvent => {
  const { attendee, organizer } = event;
  if (!attendee) return event;

  const organizerAddr = organizer?.cal_address;

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

    // Only append organizer entry if organizer exists
    const organizerEntry =
      organizer && organizerAddr
        ? getExistingOrDefault(organizerAddr, {
            ...organizer,
            role: "CHAIR",
            cutype: "INDIVIDUAL",
            partstat: "NEEDS-ACTION",
            rsvp: "TRUE",
          })
        : null;

    return {
      ...event,
      attendee: organizerEntry
        ? [...updatedAttendees, organizerEntry]
        : updatedAttendees,
    };
  }

  const updatedAttendees = attendee.map((att) => {
    if (organizerAddr && att.cal_address === organizerAddr) return att;
    return timeChanged ? markNeedsAction(att) : att;
  });

  return {
    ...event,
    attendee: updatedAttendees,
  };
};
