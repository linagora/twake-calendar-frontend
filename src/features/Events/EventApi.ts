import { api } from "../../utils/apiUtils";
import { CalendarEvent } from "./EventsTypes";
import { calendarEventToJCal, parseCalendarEvent } from "./eventUtils";
import ICAL from "ical.js";

export async function getEvent(event: CalendarEvent) {
  const response = await api.get(`dav${event.URL}`);
  const eventData = await response.text();
  const eventical = ICAL.parse(eventData);
  const eventjson = parseCalendarEvent(
    eventical[2][1][1],
    event.color ?? "",
    event.calId,
    event.URL
  );
  return { ...eventjson, ...event };
}

export async function putEvent(event: CalendarEvent) {
  const response = await api(`dav${event.URL}`, {
    method: "PUT",
    body: JSON.stringify(calendarEventToJCal(event)),
    headers: {
      "content-type": "text/calendar; charset=utf-8",
    },
  });
  if (response.status === 201) {
    console.log("PUT (201) :", response.url);
  }
  return response;
}

export async function moveEvent(event: CalendarEvent, newUrl: string) {
  const response = await api(`dav${event.URL}`, {
    method: "MOVE",
    headers: {
      destination: newUrl,
    },
  });
  return response;
}

export async function deleteEvent(eventURL: string) {
  const response = await api(`dav${eventURL}`, {
    method: "DELETE",
  });
  return response;
}
