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
import moment from "moment-timezone";
import { detectDateTimeFormat } from "../../components/Event/utils/dateTimeHelpers";
import { CalDavItem } from "../Calendars/api/types";
import { extractEventBaseUuid } from "../../utils/extractEventBaseUuid";

function resolveTimezoneId(tzid?: string): string | undefined {
  if (!tzid) return undefined;
  if (TIMEZONES.zones[tzid]) {
    return tzid;
  }
  if (TIMEZONES.aliases[tzid]) {
    return TIMEZONES.aliases[tzid].aliasTo;
  }
  return tzid;
}

export async function reportEvent(
  event: CalendarEvent,
  match: { start: string; end: string }
): Promise<CalDavItem> {
  const response = await api(`dav${event.URL}`, {
    method: "REPORT",
    body: JSON.stringify({ match }),
    headers: { Accept: "application/json" },
  });
  const eventData: CalDavItem = await response.json();
  return eventData;
}

export async function getEvent(event: CalendarEvent, isMaster?: boolean) {
  const response = await api.get(`dav${event.URL}`);
  const eventData = await response.text();

  const eventical = ICAL.parse(eventData);
  const vevents = (eventical[2] || []).filter(
    ([name]: [string]) => name.toLowerCase() === "vevent"
  );

  const vtimezones = (eventical[2] || []).filter(
    ([name]: [string]) => name.toLowerCase() === "vtimezone"
  );

  let targetVevent;
  if (isMaster) {
    targetVevent = vevents.find(
      ([, props]: [string, any[]]) =>
        !props.find(([k]: string[]) => k.toLowerCase() === "recurrence-id")
    );
    if (!targetVevent) {
      targetVevent = vevents[0];
    }
  } else {
    targetVevent = vevents[0];
  }

  let timezoneFromVTimezone: string | undefined;
  if (vtimezones.length > 0) {
    const vtimezone = vtimezones[0];
    const tzidProp = vtimezone[1]?.find(
      ([k]: string[]) => k.toLowerCase() === "tzid"
    );
    if (tzidProp && tzidProp[3]) {
      const resolvedTz = resolveTimezoneId(tzidProp[3]);
      if (resolvedTz) {
        timezoneFromVTimezone = resolvedTz;
      }
    }
  }

  let timezoneFromDTSTART: string | undefined;
  const dtstartProp = targetVevent[1]?.find(
    ([k]: string[]) => k.toLowerCase() === "dtstart"
  );
  if (dtstartProp) {
    const dtstartParams = dtstartProp[1];
    const dtstartValue = dtstartProp[3];
    if (dtstartParams) {
      const tzParam =
        dtstartParams.tzid ||
        dtstartParams.TZID ||
        dtstartParams.Tzid ||
        dtstartParams.tZid ||
        dtstartParams.tzId;
      if (tzParam) {
        const resolvedTz = resolveTimezoneId(tzParam);
        if (resolvedTz) {
          timezoneFromDTSTART = resolvedTz;
        }
      }
    }
    if (
      !timezoneFromDTSTART &&
      typeof dtstartValue === "string" &&
      dtstartValue.endsWith("Z")
    ) {
      timezoneFromDTSTART = "Etc/UTC";
    }
  }

  const eventjson = parseCalendarEvent(
    targetVevent[1],
    event.color ?? {},
    event.calId,
    event.URL
  );

  const finalTimezone =
    timezoneFromVTimezone ||
    timezoneFromDTSTART ||
    eventjson.timezone ||
    "Etc/UTC";
  eventjson.timezone = finalTimezone;

  if (!eventjson.allday && eventjson.start && finalTimezone) {
    const startISO = convertEventDateTimeToISO(eventjson.start, finalTimezone);
    if (startISO) {
      eventjson.start = startISO;
    }
  }

  if (!eventjson.allday && eventjson.end && finalTimezone) {
    const endISO = convertEventDateTimeToISO(eventjson.end, finalTimezone);
    if (endISO) {
      eventjson.end = endISO;
    }
  }

  if (isMaster) {
    const merged = { ...event, ...eventjson };
    merged.timezone = finalTimezone;
    return merged;
  }
  const merged = { ...event, ...eventjson };
  merged.timezone = finalTimezone;
  return merged;
}

function convertEventDateTimeToISO(
  datetime: string,
  eventTimezone: string
): string | undefined {
  if (!datetime || !eventTimezone) return undefined;

  if (datetime.includes("Z") || datetime.match(/[+-]\d{2}:\d{2}$/)) {
    return datetime;
  }

  const dateOnlyRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (dateOnlyRegex.test(datetime)) {
    return undefined;
  }

  const format = detectDateTimeFormat(datetime);
  const momentDate = moment.tz(datetime, format, eventTimezone);
  if (!momentDate.isValid()) {
    console.warn(
      `[convertEventDateTimeToISO] Invalid datetime: "${datetime}" with format "${format}" in timezone "${eventTimezone}"`
    );
    return undefined;
  }
  return momentDate.toISOString();
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

  if (response.status === 201) {
    console.log("Event created successfully:", response.url || event.URL);
  }

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
      uid: extractEventBaseUuid(event.uid),
    },
    true
  );
  seriesEvent.exdates = [...(seriesEvent.exdates || []), event.start];
  delete seriesEvent.recurrenceId;

  return putEvent(seriesEvent, calOwnerEmail);
};

export const updateSeriesPartstat = async (
  event: CalendarEvent,
  attendeeEmail: string,
  partstat: string
) => {
  const vevents = await getAllRecurrentEvent(event);

  // Update PARTSTAT in ALL VEVENTs (master + exceptions)
  const updatedVevents = vevents.map((vevent: any[]) => {
    const properties = vevent[1];
    const updatedProperties = properties.map((prop: any[]) => {
      // Find ATTENDEE properties
      if (prop[0] === "attendee") {
        const calAddress = prop[3];
        // Check if this is the target attendee
        if (calAddress.toLowerCase().includes(attendeeEmail.toLowerCase())) {
          // Update PARTSTAT parameter
          const params = { ...prop[1], partstat: partstat };
          return [prop[0], params, prop[2], prop[3]];
        }
      }
      return prop;
    });
    return [vevent[0], updatedProperties, vevent[2]];
  });

  const timezoneData = TIMEZONES.zones[event.timezone];
  const vtimezone = makeTimezone(timezoneData, event);

  const newJCal = [
    "vcalendar",
    [],
    [...updatedVevents, vtimezone.component.jCal],
  ];

  return api(`dav${event.URL}`, {
    method: "PUT",
    body: JSON.stringify(newJCal),
    headers: {
      "content-type": "text/calendar; charset=utf-8",
    },
  });
};

export const updateSeries = async (
  event: CalendarEvent,
  calOwnerEmail?: string,
  removeOverrides: boolean = true
) => {
  const vevents = await getAllRecurrentEvent(event);
  const masterIndex = vevents.findIndex(
    ([, props]: [string, string[]]) =>
      !props.find(([k]) => k.toLowerCase() === "recurrence-id")
  );
  if (masterIndex === -1) {
    throw new Error("No master VEVENT found for this series");
  }
  const rrule = vevents[masterIndex][1].find(([k]: string[]) => k === "rrule");

  const tzid = event.timezone;

  const updatedMaster = makeVevent(event, tzid, calOwnerEmail, true);
  const newRrule = updatedMaster[1].find(([k]: string[]) => k === "rrule");
  if (!newRrule) {
    updatedMaster[1].push(rrule);
  }

  const timezoneData = TIMEZONES.zones[event.timezone];
  const vtimezone = makeTimezone(timezoneData, event);

  let finalVevents;
  if (removeOverrides) {
    // When date/time/timezone/repeat rules changed, remove all override instances
    finalVevents = [updatedMaster];
  } else {
    // When only properties changed, keep override instances
    vevents[masterIndex] = updatedMaster;
    finalVevents = vevents;
  }

  const newJCal = [
    "vcalendar",
    [],
    [...finalVevents, vtimezone.component.jCal],
  ];
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

export async function searchEvent(
  query: string,
  filters: {
    searchIn: string[];
    keywords: string;
    organizers: string[];
    attendees: string[];
  }
) {
  const { keywords, searchIn, organizers, attendees } = filters;

  const reqParam: {
    query: string;
    calendars: { calendarId: string; userId: string }[];
    organizers?: string[];
    attendees?: string[];
  } = {
    query: !!keywords ? keywords : query,
    calendars: searchIn.map((calId) => {
      const [userId, calendarId] = calId.split("/");
      return { calendarId, userId };
    }),
  };
  if (organizers.length) {
    reqParam.organizers = organizers;
  }
  if (attendees.length) {
    reqParam.attendees = attendees;
  }
  const response = await api
    .post("calendar/api/events/search?limit=30&offset=0", {
      body: JSON.stringify(reqParam),
    })
    .json();

  return response;
}
