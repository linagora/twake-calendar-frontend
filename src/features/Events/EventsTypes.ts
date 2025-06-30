import { userAttendee, userOrganiser } from "../User/userDataTypes";

export interface CalendarEvent {
  uid: string;
  transp: string;
  start: Date; // ISO date
  end?: Date;
  class?: string;
  x_openpass_videoconference?: unknown;
  summary?: string;
  description?: string;
  location?: string;
  organizer: userOrganiser;
  attendee: userAttendee[];
  stamp?: Date;
  sequence?: Number;
}
