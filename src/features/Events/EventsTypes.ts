// types/Event.ts
export interface CalendarEvent {
  title: string;
  start: string; // ISO date
  end?: string;
  calendar:string;
  extendedProps?: {
    description?: string;
    location?: string;
  };
}
