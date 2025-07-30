import { api } from "../../utils/apiUtils";
import { Calendars } from "../Calendars/CalendarTypes";
import { CalendarEvent } from "./EventsTypes";
import { calendarEventToJCal } from "./eventUtils";

export async function putEvent(cal: Calendars, event: CalendarEvent) {
  const response = await api(
    `dav/calendars/${cal.id}/${event.uid.split("/")[0]}.isc`,
    {
      method: "PUT",
      body: JSON.stringify(calendarEventToJCal(event)),
      headers: {
        "content-type": "text/calendar; charset=utf-8",
      },
    }
  ).json();
  return response;
}

export async function deleteEvent(calId: string, eventId: string) {
  const response = await api(
    `dav/calendars/${calId}/${eventId.split("/")[0]}.isc`,
    {
      method: "DELETE",
    }
  ).json();
  return response;
}
