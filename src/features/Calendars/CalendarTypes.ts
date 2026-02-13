import { CalendarEvent } from "../Events/EventsTypes";
import { OpenPaasUserData } from "../User/type/OpenPaasUserData";

export interface Calendar {
  id: string;
  link: string;
  name: string;
  delegated?: boolean;
  prodid?: string;
  color?: Record<string, string>;
  owner: OpenPaasUserData;
  description?: string;
  calscale?: string;
  version?: string;
  events: Record<string, CalendarEvent>;
  visibility: "private" | "public";
  lastCacheCleared?: number;
  syncToken?: string;
}
