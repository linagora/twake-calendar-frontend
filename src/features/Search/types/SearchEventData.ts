export type SearchEventData = {
  uid: string;
  userId: string;
  calendarId: string;
  start: string;
  end?: string;
  allDay?: boolean;
  summary?: string;
  description?: string;
  location?: string;
  class?: string;
  dtstamp?: string;
  isRecurrentMaster?: boolean;
  attendees?: unknown[];
  organizer?: {
    cn?: string;
    email?: string;
  };
  ["x-openpaas-videoconference"]?: string;
};
