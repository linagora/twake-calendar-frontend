import { Calendar } from "../Calendars/CalendarTypes";
import { userAttendee } from "../User/models/attendee";
import { userOrganiser } from "../User/userDataTypes";

export interface CalendarEvent {
  URL: string;
  calId: string;
  uid: string;
  recurrenceId?: string;
  transp?: string;
  start: string; // ISO date string
  end?: string;
  class?: "PRIVATE" | "PUBLIC" | "CONFIDENTIAL";
  x_openpass_videoconference?: string;
  title?: string;
  description?: string;
  location?: string;
  organizer?: userOrganiser;
  attendee: userAttendee[];
  stamp?: string;
  sequence?: number;
  color?: Record<string, string>;
  allday?: boolean;
  error?: string;
  status?: string;
  timezone: string;
  repetition?: RepetitionObject;
  alarm?: AlarmObject;
  exdates?: string[];
}

export interface RepetitionObject {
  freq: string;
  interval?: number | null;
  byday?: string[] | null;
  occurrences?: number | null;
  endDate?: string | null;
}

export interface AlarmObject {
  trigger: string;
  action: string;
}

export interface ContextualizedEvent {
  event: CalendarEvent;
  calendar: Calendar;
  currentUserAttendee: userAttendee | undefined;
  isOwn: boolean;
  isRecurring: boolean;
  isOrganizer: boolean;
}
