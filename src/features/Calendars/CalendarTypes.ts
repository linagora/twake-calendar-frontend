import { CalendarEvent } from "../Events/EventsTypes";

export interface Calendars {
  id: string;
  name: string;
  delegated?: boolean;
  prodid?: string;
  color?: string;
  ownerEmails?: string[];
  owner: string;
  description?: string;
  calscale?: string;
  version?: string;
  events: Record<string, CalendarEvent>;
}
