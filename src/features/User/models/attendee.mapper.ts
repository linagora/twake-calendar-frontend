import { userAttendee } from "./attendee";

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
