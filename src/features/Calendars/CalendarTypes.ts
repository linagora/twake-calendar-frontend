import { CalendarEvent } from "../Events/EventsTypes";

export interface Calendar {
  id: string;
  link: string;
  name: string;
  delegated?: boolean;
  prodid?: string;
  color?: Record<string, string>;
  ownerEmails?: string[];
  owner: string;
  description?: string;
  calscale?: string;
  version?: string;
  events: Record<string, CalendarEvent>;
  visibility: "private" | "public";
  lastCacheCleared?: number;
}
