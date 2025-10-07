import { api } from "../../utils/apiUtils";
import { TIMEZONES } from "../../utils/timezone-data";
import { CalendarEvent } from "./EventsTypes";
import {
  calendarEventToJCal,
  makeTimezone,
  makeVevent,
  parseCalendarEvent,
} from "./eventUtils";
import ICAL from "ical.js";

export async function getEvent(event: CalendarEvent, isMaster?: boolean) {
  const response = await api.get(`dav${event.URL}`);
  const eventData = await response.text();

  const eventical = ICAL.parse(eventData);

  const eventjson = parseCalendarEvent(
    eventical[2][1][1],
    event.color ?? "",
    event.calId,
    event.URL
  );
  if (isMaster) {
    return { ...event, ...eventjson };
  }
  return { ...eventjson, ...event };
}

export async function dlEvent(event: CalendarEvent) {
  const response = await api.get(`dav${event.URL}?export=`);
  const eventData = await response.text();

  return eventData;
}

export async function putEvent(event: CalendarEvent, calOwnerEmail?: string) {
  const response = await api(`dav${event.URL}`, {
    method: "PUT",
    body: JSON.stringify(calendarEventToJCal(event, calOwnerEmail)),
    headers: {
      "content-type": "text/calendar; charset=utf-8",
    },
  });
  return response;
}

export async function putEventWithOverrides(
  updatedEvent: CalendarEvent,
  calOwnerEmail?: string
) {
  const vevents = await getAllRecurrentEvent(updatedEvent);

  const updatedVevent = makeVevent(
    updatedEvent,
    updatedEvent.timezone,
    calOwnerEmail,
    !updatedEvent.recurrenceId
  );
  let replaced = false;
  for (let i = 0; i < vevents.length; i++) {
    const ve = vevents[i];
    const recurrenceId = ve[1].find(([k]: string[]) => k === "recurrence-id");
    if (recurrenceId && recurrenceId[3] === updatedEvent.recurrenceId) {
      vevents[i] = updatedVevent; // replace
      replaced = true;
      break;
    }
  }
  if (!replaced && updatedEvent.recurrenceId) {
    vevents.push(updatedVevent); // add new override
  }

  const timezoneData = TIMEZONES.zones[updatedEvent.timezone];
  const vtimezone = makeTimezone(timezoneData, updatedEvent);

  const newJCal = ["vcalendar", [], [...vevents, vtimezone.component.jCal]];

  return api(`dav${updatedEvent.URL}`, {
    method: "PUT",
    body: JSON.stringify(newJCal),
    headers: {
      "content-type": "text/calendar; charset=utf-8",
    },
  });
}

export const deleteEventInstance = async (
  event: CalendarEvent,
  calOwnerEmail?: string
) => {
  const seriesEvent = await getEvent(
    {
      ...event,
      uid: event.uid.split("/")[0],
    },
    true
  );
  seriesEvent.exdates = [...(seriesEvent.exdates || []), event.start];
  delete seriesEvent.recurrenceId;

  return putEvent(seriesEvent, calOwnerEmail);
};

export const updateSeries = async (
  event: CalendarEvent,
  calOwnerEmail?: string
) => {
  const vevents = await getAllRecurrentEvent(event);
  const masterIndex = vevents.findIndex(
    ([, props]: [string, string[]]) =>
      !props.find(([k]) => k.toLowerCase() === "recurrence-id")
  );
  if (masterIndex === -1) {
    throw new Error("No master VEVENT found for this series");
  }
  const rrule = vevents[0][1].find(([k]: string[]) => k === "rrule");

  const tzid = event.timezone;

  const updatedMaster = makeVevent(event, tzid, calOwnerEmail, true);
  const newRrule = updatedMaster[1].find(([k]: string[]) => k === "rrule");
  if (!newRrule) {
    updatedMaster[1].push(rrule);
  }
  vevents[masterIndex] = updatedMaster;

  const timezoneData = TIMEZONES.zones[event.timezone];
  const vtimezone = makeTimezone(timezoneData, event);

  const newJCal = ["vcalendar", [], [...vevents, vtimezone.component.jCal]];
  return api(`dav${event.URL}`, {
    method: "PUT",
    body: JSON.stringify(newJCal),
    headers: {
      "content-type": "text/calendar; charset=utf-8",
    },
  });
};

async function getAllRecurrentEvent(event: CalendarEvent) {
  const response = await api.get(`dav${event.URL}`);
  const eventData = await response.text();
  const jcal = ICAL.parse(eventData);
  const vevents = jcal[2].filter(([name]: string[]) => name === "vevent");
  return vevents;
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

export async function importEventFromFile(id: string, calLink: string) {
  const response = await api.post(`api/import`, {
    body: JSON.stringify({ fileId: id, target: calLink }),
  });
  return response;
}
