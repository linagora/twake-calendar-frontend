import { api } from "@/utils/apiUtils";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import { TIMEZONES } from "@/utils/timezone-data";
import ICAL from "ical.js";
import { CalendarEvent } from "../EventsTypes";
import { makeTimezone, makeVevent } from "../utils";

export async function postCounterProposal({
  event,
  senderEmail,
  recipientEmail,
  proposedStart,
  proposedEnd,
  message,
}: {
  event: CalendarEvent;
  senderEmail: string;
  recipientEmail: string;
  proposedStart: string;
  proposedEnd: string;
  message?: string;
}): Promise<Response> {
  // Build the counter event with proposed dates
  const counterEvent: CalendarEvent = {
    ...event,
    start: proposedStart,
    end: proposedEnd,
    sequence: event.sequence ?? 0,
  };

  // Build vevent jCal
  const vevent = makeVevent(
    counterEvent,
    counterEvent.timezone,
    senderEmail,
    !event.recurrenceId
  );
  if (message) {
    vevent?.[1]?.push(["comment", {}, "text", message]);
  }
  // Build vtimezone
  const timezoneData = TIMEZONES.zones[counterEvent.timezone];
  const vtimezone = makeTimezone(timezoneData, counterEvent);

  // Assemble full vcalendar with METHOD:COUNTER
  const jcal = [
    "vcalendar",
    [
      ["version", {}, "text", "2.0"],
      ["prodid", {}, "text", "-//OpenPaaS//OpenPaaS//EN"],
      ["method", {}, "text", "COUNTER"],
    ],
    [vevent, vtimezone.component.jCal],
  ];

  // Serialize to raw ICS
  const counterICS = new ICAL.Component(jcal).toString();

  const postResponse = await api(`dav${event.URL}`, {
    method: "POST",
    body: JSON.stringify({
      ical: counterICS,
      sender: senderEmail,
      recipient: recipientEmail,
      uid: extractEventBaseUuid(event.uid),
      sequence: counterEvent.sequence,
      method: "COUNTER",
    }),
    headers: {
      accept: "application/json,text/plain,*/*",
      "content-type": "application/calendar+json",
      Prefer: "return=representation",
      "X-Http-Method-Override": "ITIP",
    },
  });

  if (!postResponse.ok) {
    throw new Error(
      `postCounterProposal failed with status ${postResponse.status}`
    );
  }

  return postResponse;
}
