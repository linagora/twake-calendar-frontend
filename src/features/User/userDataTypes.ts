export interface userData {
  email: string;
  sid: string;
  sub: string;
  openpaasId?: string;
}

export interface userOrganiser {
  cn: string;
  cal_address: string;
}

export interface userAttendee {
  cn: string;
  cal_address: string;
  partstat: string;
  rsvp: string;
  role: string;
  cutype: string;
}
