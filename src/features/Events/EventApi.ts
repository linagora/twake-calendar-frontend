import { api } from "@/utils/apiUtils";
import { resolveTimezoneId, convertEventDateTimeToISO } from "@/utils/timezone";
import { TIMEZONES } from "@/utils/timezone-data";
import ICAL from "ical.js";
import { CalDavItem } from "../Calendars/api/types";
import { SearchEventsResponse } from "../Search/types/SearchEventsResponse";
import { CalendarEvent } from "./EventsTypes";
import {
  calendarEventToJCal,
  makeTimezone,
  makeVevent,
  parseCalendarEvent,
} from "./eventUtils";

type JCalValue = string | number | boolean | null;

type JCalParams = Record<string, JCalValue | JCalValue[]>;

type JCalProperty = [
  name: string,
  params: JCalParams,
  type: string,
  value: JCalValue,
];

type JCalComponent = [
  name: string,
  properties: JCalProperty[],
  components?: JCalComponent[],
];

export async function reportEvent(
  event: CalendarEvent,
  match: { start: string; end: string }
): Promise<CalDavItem> {
  const response = await api(`dav${event.URL}`, {
    method: "REPORT",
    body: JSON.stringify({ match }),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`REPORT request failed with status ${response.status}`);
  }
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
      ([, props]: JCalComponent) =>
        !props.find(([k]) => k.toLowerCase() === "recurrence-id")
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
    console.info("Event created successfully:", response.url || event.URL);
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

export const deleteEventInstance = async (event: CalendarEvent) => {
  // Get all VEVENTs (master + overrides) from the series
  const vevents = await getAllRecurrentEvent(event);

  // Find the master VEVENT
  const masterIndex = vevents.findIndex(
    ([, props]: JCalComponent) =>
      !props.find(([k]) => k.toLowerCase() === "recurrence-id")
  );

  if (masterIndex === -1) {
    throw new Error("No master VEVENT found for this series");
  }

  const exdateValue = event.recurrenceId || event.start;
  const seriesEvent = parseCalendarEvent(vevents[masterIndex][1], {}, "", "");
  const masterProps = vevents[masterIndex][1];

  // Check if this date is already in EXDATE (avoid duplicates)
  const normalizeRecurrenceId = (id: JCalValue) =>
    String(id ?? "").replace(/Z$/, "");
  const isDuplicate = masterProps.some((prop: JCalProperty) => {
    if (prop[0].toLowerCase() === "exdate" && prop[3]) {
      return (
        normalizeRecurrenceId(prop[3]) === normalizeRecurrenceId(exdateValue)
      );
    }
    return false;
  });

  if (!isDuplicate) {
    // Add new EXDATE property as a separate entry
    const valueType = seriesEvent.allday ? "date" : "date-time";
    masterProps.push(["exdate", {}, valueType, exdateValue]);
  }

  // Update the master VEVENT with the new properties
  vevents[masterIndex][1] = masterProps;

  // Remove the override instance if it exists (in case it was an override being deleted)
  const filteredVevents = vevents.filter(([, props]: JCalComponent) => {
    const recurrenceIdProp = props.find(
      ([k]) => k.toLowerCase() === "recurrence-id"
    );
    if (!recurrenceIdProp) return true; // Keep master
    return (
      normalizeRecurrenceId(recurrenceIdProp[3]) !==
      normalizeRecurrenceId(event.recurrenceId ?? "")
    ); // Remove matching override
  });

  // Build the updated jCal with all VEVENTs and timezone
  const timezoneData = TIMEZONES.zones[seriesEvent.timezone];
  const vtimezone = makeTimezone(timezoneData, seriesEvent);

  const newJCal = [
    "vcalendar",
    [],
    [...filteredVevents, vtimezone.component.jCal],
  ];

  return api(`dav${event.URL}`, {
    method: "PUT",
    body: JSON.stringify(newJCal),
    headers: {
      "content-type": "text/calendar; charset=utf-8",
    },
  });
};

export const updateSeriesPartstat = async (
  event: CalendarEvent,
  attendeeEmail: string,
  partstat: string
) => {
  const vevents = await getAllRecurrentEvent(event);

  // Update PARTSTAT in ALL VEVENTs (master + exceptions)
  const updatedVevents = vevents.map((vevent: JCalComponent) => {
    const properties = vevent[1];
    const updatedProperties = properties.map((prop: JCalProperty) => {
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
    ([, props]: JCalComponent) =>
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
    // When only properties changed, keep override instances and update their metadata
    const updatedVevents = vevents.map((vevent, index) => {
      if (index === masterIndex) {
        return updatedMaster;
      }

      const [veventType, props] = vevent;
      const updatedProps = [...updatedMaster[1]];

      // Fields that should be updated from master (metadata)
      const updateFields = [
        "summary",
        "description",
        "location",
        "class",
        "transp",
        "attendee",
        "organizer",
        "valarm",
        "x-openpaas-videoconference",
      ];

      // Start with existing exception properties
      const newProps = [...props];

      // Update each metadata field from the master
      updateFields.forEach((fieldName) => {
        const fieldNameLower = fieldName.toLowerCase();

        // Remove old values of this field from exception
        const filteredProps = newProps.filter(
          ([k]) => k.toLowerCase() !== fieldNameLower
        );

        // Get new values from updated master
        const newValues = updatedProps.filter(
          ([k]) => k.toLowerCase() === fieldNameLower
        );

        // Replace with new values
        newProps.length = 0;
        newProps.push(...filteredProps, ...newValues);
      });

      // Increment sequence number for the exception
      const sequenceIndex = newProps.findIndex(
        ([k]) => k.toLowerCase() === "sequence"
      );
      if (sequenceIndex !== -1) {
        const currentSequence = parseInt(newProps[sequenceIndex][3] || "0", 10);
        newProps[sequenceIndex] = [
          newProps[sequenceIndex][0],
          newProps[sequenceIndex][1],
          newProps[sequenceIndex][2],
          String(currentSequence + 1),
        ];
      } else {
        // Add sequence if it doesn't exist
        newProps.push(["sequence", {}, "integer", "1"]);
      }

      return [veventType, newProps];
    });

    finalVevents = updatedVevents;
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
): Promise<SearchEventsResponse> {
  const { keywords, searchIn, organizers, attendees } = filters;

  const reqParam: {
    query: string;
    calendars: { calendarId: string; userId: string }[];
    organizers?: string[];
    attendees?: string[];
  } = {
    query: keywords ? keywords : query,
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

  return response as SearchEventsResponse;
}
