export type AttendeeRole = "CHAIR" | "REQ-PARTICIPANT" | "OPT-PARTICIPANT";
export type CuType = "INDIVIDUAL" | "GROUP";
export type PartStat = "ACCEPTED" | "DECLINED" | "TENTATIVE" | "NEEDS-ACTION";

export interface userAttendee {
  cal_address: string;
  partstat: PartStat;
  role: AttendeeRole;
  cutype: CuType;
  rsvp: "TRUE" | "FALSE";
  cn: string;
}
