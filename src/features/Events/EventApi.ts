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
    // If it's an instance (has recurrenceId), try to find the specific exception VEVENT
    if (event.recurrenceId) {
      targetVevent = vevents.find(([name, props]: [string, any[]]) => {
        const rid = props.find(
          ([k]: string[]) => k.toLowerCase() === "recurrence-id"
        );
        return rid && rid[3] === event.recurrenceId;
      });
    }

    // If no specific exception found (or not an instance), fall back to master
    if (!targetVevent) {
      targetVevent = vevents.find(
        ([, props]: [string, any[]]) =>
          !props.find(([k]: string[]) => k.toLowerCase() === "recurrence-id")
      );
    }

    // Fallback to first vevent if still nothing
    if (!targetVevent) {
      targetVevent = vevents[0];
    }
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

  // If we couldn't find a specific exception VEVENT (targetVevent is master),
  // but we requested an instance (event.recurrenceId exists),
  // we must preserve the instance's start/end/recurrenceId from the input event.
  // Otherwise, we overwrite the instance with master's data.
  const isException =
    event.recurrenceId &&
    targetVevent[1].some(
      ([k, , , v]: any[]) =>
        k.toLowerCase() === "recurrence-id" && v === event.recurrenceId
    );

  if (event.recurrenceId && !isException) {
    // It's an expanded instance without an exception VEVENT yet.
    // Use master's props (eventjson) but keep instance's time and ID.
    const merged = {
      ...eventjson, // Master's data (title, desc, etc.)
      ...event, // Instance's data (start, end, recurrenceId, uid)
      title: eventjson.title,
      description: eventjson.description,
      location: eventjson.location,
      attendee: eventjson.attendee,
      alarm: eventjson.alarm,
      // Keep instance specific fields
      start: event.start,
      end: event.end,
      recurrenceId: event.recurrenceId,
      uid: event.uid,
    };
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

  // Find existing instance to get current SEQUENCE before creating updated vevent
  let existingSequence: number | undefined = undefined;
  if (updatedEvent.recurrenceId) {
    for (const ve of vevents) {
      const recurrenceId = ve[1].find(([k]: string[]) => k === "recurrence-id");
      if (recurrenceId && recurrenceId[3] === updatedEvent.recurrenceId) {
        // Found existing instance, extract SEQUENCE
        const sequenceProp = ve[1].find(
          ([k]: string[]) => k.toLowerCase() === "sequence"
        );
        if (sequenceProp && sequenceProp[3] !== undefined) {
          existingSequence = Number(sequenceProp[3]);
        }
        break;
      }
    }
  }

  // Use existing sequence if found, otherwise use undefined (so makeVevent sets it to 1)
  // Do NOT use updatedEvent.sequence as it might be the master's sequence
  const eventWithCorrectSequence = {
    ...updatedEvent,
    sequence: existingSequence !== undefined ? existingSequence : undefined,
  };

  const updatedVevent = makeVevent(
    eventWithCorrectSequence,
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

  // Get current SEQUENCE from master event on server
  const masterVevent = vevents[masterIndex];
  const sequenceProp = masterVevent[1].find(
    ([k]: string[]) => k.toLowerCase() === "sequence"
  );
  const existingSequence =
    sequenceProp && sequenceProp[3] !== undefined
      ? Number(sequenceProp[3])
      : undefined;

  const tzid = event.timezone;

  // Use existing sequence if found, otherwise use sequence from event
  const eventWithCorrectSequence = {
    ...event,
    sequence:
      existingSequence !== undefined ? existingSequence : event.sequence,
  };

  const updatedMaster = makeVevent(
    eventWithCorrectSequence,
    tzid,
    calOwnerEmail,
    true
  );
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
