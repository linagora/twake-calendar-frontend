export type AttendeeRole = "CHAIR" | "REQ-PARTICIPANT" | "OPT-PARTICIPANT";
export type CuType = "INDIVIDUAL" | "GROUP";

export interface userAttendee {
  cal_address: string;
  partstat: string;
  role: AttendeeRole;
  cutype: CuType;
  rsvp: "TRUE" | "FALSE";
  cn: string;
}
