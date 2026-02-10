// timezone.ts

// Ensure ICAL is imported before using this module.
import ICAL from "ical.js";
import moment from "moment-timezone";
import { detectDateTimeFormat } from "@/components/Event/utils/dateTimeHelpers";

// TIMEZONES data must be imported or defined separately.
import { TIMEZONES } from "./timezone-data";

export const browserDefaultTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone;

// Core timezone registration functionality
export function registerTimezones() {
  for (const [key, data] of Object.entries(TIMEZONES.zones)) {
    ICAL.TimezoneService.register(key, buildTimezone(key, data.ics));
  }

  for (const [key, data] of Object.entries(TIMEZONES.aliases)) {
    ICAL.TimezoneService.register(key, findTimezone(data.aliasTo));
  }
}

function buildTimezone(tzid: string, ics: string): ICAL.Timezone {
  return (
    ICAL.TimezoneService.get(tzid) ||
    new ICAL.Timezone(new ICAL.Component(ICAL.parse(ics)))
  );
}

function findTimezone(tzid: string): ICAL.Timezone {
  if (TIMEZONES.zones[tzid]) {
    return buildTimezone(tzid, TIMEZONES.zones[tzid].ics);
  }

  const alias = TIMEZONES.aliases[tzid];
  if (alias && alias.aliasTo) {
    return findTimezone(alias.aliasTo);
  }

  throw new Error(`Unknown timezone alias: ${tzid}`);
}

export function resolveTimezone(tzName: string): string {
  if (TIMEZONES.zones[tzName]) {
    return tzName;
  }
  if (TIMEZONES.aliases[tzName]) {
    return TIMEZONES.aliases[tzName].aliasTo;
  }
  return tzName;
}

export function resolveTimezoneId(tzid?: string): string | undefined {
  if (!tzid) return undefined;
  return resolveTimezone(tzid);
}

export function convertEventDateTimeToISO(
  datetime: string,
  timezone: string,
  options?: { isAllDay?: boolean }
): string | undefined {
  if (!datetime || !timezone) return undefined;
  if (options?.isAllDay) return undefined;

  if (datetime.includes("Z") || datetime.match(/[+-]\d{2}:\d{2}$/)) {
    return datetime;
  }

  const dateOnlyRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (dateOnlyRegex.test(datetime)) {
    return undefined;
  }

  const format = detectDateTimeFormat(datetime);
  const momentDate = moment.tz(datetime, format, timezone);
  if (!momentDate.isValid()) {
    console.warn(
      `[convertEventDateTimeToISO] Invalid datetime: "${datetime}" with format "${format}" in timezone "${timezone}"`
    );
    return undefined;
  }
  return momentDate.toISOString();
}

export function getTimezoneOffset(
  tzName: string,
  date: Date = new Date()
): string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    timeZone: tzName,
    timeZoneName: "shortOffset",
  });

  const currentDate = moment(date).isValid() ? date : new Date();
  const parts = fmt.formatToParts(currentDate);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  return offsetPart?.value.replace("GMT", "UTC") ?? "";
}
