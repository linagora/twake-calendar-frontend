import { userAttendee, userOrganiser } from "../User/userDataTypes";

export interface CalendarEvent {
  URL: string;
  calId: string;
  uid: string;
  transp?: string;
  start: Date; // ISO date
  end?: Date;
  class?: string;
  x_openpass_videoconference?: string;
  title?: string;
  description?: string;
  location?: string;
  organizer?: userOrganiser;
  attendee: userAttendee[];
  stamp?: Date;
  sequence?: Number;
  color?: string;
  allday?: boolean;
  error?: string;
  status?: string;
  timezone: string;
  repetition?: RepetitionObject;
  alarm?: AlarmObject;
}

export interface RepetitionObject {
  freq: string;
  interval?: number;
  selectedDays?: string[];
  occurrences?: number;
  endDate?: string;
}

export interface AlarmObject {
  trigger: string;
  action: string;
}
