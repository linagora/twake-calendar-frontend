import { api } from "../../utils/apiUtils";
import { CalendarEvent } from "./EventsTypes";
import { calendarEventToJCal } from "./eventUtils";

export async function putEvent(event: CalendarEvent) {
  const response = await api(`dav${event.URL}`, {
    method: "PUT",
    body: JSON.stringify(calendarEventToJCal(event)),
    headers: {
      "content-type": "text/calendar; charset=utf-8",
    },
  });
  if (response.status === 201) {
    console.log("PUT :", response.url);
  }
  return await response.json();
}

export async function deleteEvent(eventURL: string) {
  const response = await api(eventURL, {
    method: "DELETE",
  }).json();
  return response;
}
