import { api } from "../../utils/apiUtils";
import { Calendars } from "../Calendars/CalendarTypes";
import { CalendarEvent } from "./EventsTypes";
import { calendarEventToICal, calendarEventToJCal } from "./eventUtils";

export async function putEvent(cal: Calendars, event: CalendarEvent) {
  const response = await api(
    `dav/calendars/${cal.id}/${event.uid.split(".")[0]}.isc`,
    {
      method: "PUT",
      body: JSON.stringify(calendarEventToICal(cal, event)),
      headers: {
        "content-type": "text/calendar; charset=utf-8",
      },
    }
  ).json();
  return response;
}

export async function getEvent(calID: string, eventID: string) {
  const response = await api
    .get(`dav/calendars/${calID}/${eventID}.ics`)
    .json();
  return response;
}
