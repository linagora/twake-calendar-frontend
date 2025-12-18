import { User } from "../../../components/Attendees/PeopleSearch";
import { userData } from "../userDataTypes";
import { userAttendee } from "./attendee";

export function createAttendeeFromUserData(
  user: userData,
  options?: {
    role?: userAttendee["role"];
    partstat?: string;
    rsvp?: userAttendee["rsvp"];
  }
): userAttendee {
  return {
    cal_address: user.email,
    cn: `${user.given_name} ${user.family_name}`,
    cutype: "INDIVIDUAL",
    role: options?.role ?? "REQ-PARTICIPANT",
    partstat: options?.partstat ?? "NEEDS-ACTION",
    rsvp: options?.rsvp ?? "FALSE",
  };
}

export function createAttendeeFromUser(
  user: User,
  options?: {
    role?: userAttendee["role"];
    partstat?: string;
    rsvp?: userAttendee["rsvp"];
  }
): userAttendee {
  return {
    cal_address: user.email,
    cn: user.displayName || user.email,
    cutype: "INDIVIDUAL",
    role: options?.role ?? "REQ-PARTICIPANT",
    partstat: options?.partstat ?? "NEEDS-ACTION",
    rsvp: options?.rsvp ?? "FALSE",
  };
}
