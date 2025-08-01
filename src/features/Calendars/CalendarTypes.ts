import { CalendarEvent } from "../Events/EventsTypes";

export interface Calendars {
  id: string;
  name: string;
  prodid?: string;
  color?: string;
  ownerEmails?: string[];
  description?: string;
  calscale?: string;
  version?: string;
  events: Record<string, CalendarEvent>;
}
