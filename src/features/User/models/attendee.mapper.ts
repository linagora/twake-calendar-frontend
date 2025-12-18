import { User } from "../../../components/Attendees/PeopleSearch";
import { userData } from "../userDataTypes";
import { userAttendee } from "./attendee";

export function createAttendeeFromUserData(
  user: userData | undefined,
  options?: {
    role?: userAttendee["role"];
    partstat?: userAttendee["partstat"];
    rsvp?: userAttendee["rsvp"];
  }
): userAttendee {
  return {
    cal_address: user?.email ?? "",
    cn: buildFamilyName(user?.given_name, user?.family_name, user?.email ?? ""),
    cutype: "INDIVIDUAL",
    role: options?.role ?? "REQ-PARTICIPANT",
    partstat: options?.partstat ?? "NEEDS-ACTION",
    rsvp: options?.rsvp ?? "FALSE",
  };
}

function buildFamilyName(
  firstName: string | undefined,
  lastName: string | undefined,
  email: string
): string {
  const trimmedFirstName = firstName?.trim() || "";
  const trimmedLastName = lastName?.trim() || "";
  const fullName = [trimmedFirstName, trimmedLastName]
    .filter(Boolean)
    .join(" ");
  return fullName || email;
}

export function createAttendeeFromUser(
  user: User,
  options?: {
    role?: userAttendee["role"];
    partstat?: userAttendee["partstat"];
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

export function createAttendee(options?: {
  cal_address?: string;
  cn?: string;
  role?: userAttendee["role"];
  partstat?: userAttendee["partstat"];
  rsvp?: userAttendee["rsvp"];
  cutype?: userAttendee["cutype"];
}): userAttendee {
  return {
    cal_address: options?.cal_address ?? "",
    cn: options?.cn ?? "",
    cutype: options?.cutype ?? "INDIVIDUAL",
    role: options?.role ?? "REQ-PARTICIPANT",
    partstat: options?.partstat ?? "NEEDS-ACTION",
    rsvp: options?.rsvp ?? "FALSE",
  };
}
