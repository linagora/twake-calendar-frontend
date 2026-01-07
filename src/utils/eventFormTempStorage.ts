import { RepetitionObject } from "../features/Events/EventsTypes";
import { userAttendee } from "../features/User/models/attendee";

export interface EventFormTempData {
  // Form fields
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allday: boolean;
  repetition: RepetitionObject;
  attendees: userAttendee[];
  alarm: string;
  busy: string;
  eventClass: string;
  timezone: string;
  calendarid: string;
  hasVideoConference: boolean;
  meetingLink: string | null;
  // UI state
  showMore?: boolean;
  showDescription?: boolean;
  showRepeat?: boolean;
  hasEndDateChanged?: boolean;
  // Context (for update modal only)
  eventId?: string;
  calId?: string;
  typeOfAction?: "solo" | "all";
  // Flag to indicate this is from an error
  fromError?: boolean;
}

const STORAGE_KEY_PREFIX = "eventFormTempData_";

export function saveEventFormDataToTemp(
  modalType: "create" | "update",
  formData: EventFormTempData
): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${modalType}`;
    sessionStorage.setItem(key, JSON.stringify(formData));
  } catch (error) {
    console.error("Failed to save form data to temp storage:", error);
  }
}

export function restoreEventFormDataFromTemp(
  modalType: "create" | "update"
): EventFormTempData | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${modalType}`;
    const data = sessionStorage.getItem(key);
    if (data) {
      return JSON.parse(data) as EventFormTempData;
    }
    return null;
  } catch (error) {
    console.error("Failed to restore form data from temp storage:", error);
    return null;
  }
}

export function clearEventFormTempData(modalType: "create" | "update"): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${modalType}`;
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear form data from temp storage:", error);
  }
}

export function showErrorNotification(message: string): void {
  console.error(`[ERROR] ${message}`);
}

export interface EventFormState {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allday: boolean;
  repetition: RepetitionObject;
  attendees: userAttendee[];
  alarm: string;
  busy: string;
  eventClass: string;
  timezone: string;
  calendarid: string;
  hasVideoConference: boolean;
  meetingLink: string | null;
  showMore?: boolean;
  showDescription?: boolean;
  showRepeat?: boolean;
  hasEndDateChanged?: boolean;
}

export interface EventFormContext {
  eventId?: string;
  calId?: string;
  typeOfAction?: "solo" | "all";
}

export function buildEventFormTempData(
  formState: EventFormState,
  context?: EventFormContext
): EventFormTempData {
  return {
    ...formState,
    ...context,
    fromError: false,
  };
}

export interface EventFormSetters {
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setLocation: (value: string) => void;
  setStart: (value: string) => void;
  setEnd: (value: string) => void;
  setAllDay: (value: boolean) => void;
  setRepetition: (value: RepetitionObject) => void;
  setAttendees: (value: userAttendee[]) => void;
  setAlarm: (value: string) => void;
  setBusy: (value: string) => void;
  setEventClass: (value: string) => void;
  setTimezone: (value: string) => void;
  setCalendarid: (value: string) => void;
  setHasVideoConference: (value: boolean) => void;
  setMeetingLink: (value: string | null) => void;
  setShowMore?: (value: boolean) => void;
  setShowDescription?: (value: boolean) => void;
  setShowRepeat?: (value: boolean) => void;
  setHasEndDateChanged?: (value: boolean) => void;
}

export function restoreFormDataFromTemp(
  tempData: EventFormTempData,
  setters: EventFormSetters
): void {
  setters.setTitle(tempData.title);
  setters.setDescription(tempData.description);
  setters.setLocation(tempData.location);
  setters.setStart(tempData.start);
  setters.setEnd(tempData.end);
  setters.setAllDay(tempData.allday);
  setters.setRepetition(tempData.repetition);
  setters.setAttendees(tempData.attendees);
  setters.setAlarm(tempData.alarm);
  setters.setBusy(tempData.busy);
  setters.setEventClass(tempData.eventClass);
  setters.setTimezone(tempData.timezone);
  setters.setCalendarid(tempData.calendarid);
  setters.setHasVideoConference(tempData.hasVideoConference);
  setters.setMeetingLink(tempData.meetingLink);
  if (tempData.showMore !== undefined && setters.setShowMore) {
    setters.setShowMore(tempData.showMore);
  }
  if (tempData.showDescription !== undefined && setters.setShowDescription) {
    setters.setShowDescription(tempData.showDescription);
  }
  if (tempData.showRepeat !== undefined && setters.setShowRepeat) {
    setters.setShowRepeat(tempData.showRepeat);
  }
  if (
    tempData.hasEndDateChanged !== undefined &&
    setters.setHasEndDateChanged
  ) {
    setters.setHasEndDateChanged(tempData.hasEndDateChanged);
  }
}
