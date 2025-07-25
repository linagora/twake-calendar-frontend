export interface userData {
  email: string;
  family_name: string;
  given_name: string;
  name: string;
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
