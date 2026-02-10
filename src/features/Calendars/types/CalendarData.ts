import { User } from "@/components/Attendees/PeopleSearch";
import { CalDavLink } from "../api/types";

// Access control entry
export interface AclEntry {
  privilege: string;
  principal: string;
  protected: boolean;
}

// VObject property value can be various types
export type VObjectValue =
  | string
  | number
  | boolean
  | Date
  | Record<string, unknown>
  | null
  | RepetitionRule
  | undefined;

// VObject property tuple
export type VObjectProperty = [
  string,
  Record<string, unknown>,
  string | Array<unknown>,
  VObjectValue,
];

export type VCalComponent = [
  string,
  VObjectProperty[],
  VCalComponent[],
  ...unknown[],
];

export interface Organizer {
  cn?: string;
  email: string;
}

// The `dav:item` object in _embedded
export interface CalendarItem {
  _links: CalDavLink;
  etag: string;
  status: number;
  data: [
    "vcalendar",
    Array<
      VObjectProperty | [string, VObjectProperty[], unknown[]] // vevent array
    >,
  ];
}

// Main calendar data
export interface CalendarData {
  _links: CalDavLink;
  "caldav:description"?: string;
  "dav:name"?: string;
  "apple:color"?: string;
  id?: string;
  acl?: AclEntry[];
  invite?: unknown;
  _embedded: {
    "sync-token": string;
    "dav:item": CalendarItem[];
  };
  "calendarserver:source"?: { _links: CalDavLink };
  "calendarserver:delegatedsource"?: string;
}

export interface CalendarList {
  _embedded: { "dav:calendar": CalendarData[] };
}

// Calendar input for forms or UI
export interface CalendarInput {
  cal: CalendarData;
  color: Record<string, string>;
  owner?: User;
}

// Vevent repetition rule
export interface RepetitionRule {
  freq: string;
  interval?: number;
  count?: number;
  until?: string;
  byday?: string | string[];
}
