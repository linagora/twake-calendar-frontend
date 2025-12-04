// timezone.ts

// Ensure ICAL is imported before using this module.
import ICAL from "ical.js";

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

function buildTimezone(tzid: string, ics: string): any {
  return (
    ICAL.TimezoneService.get(tzid) ||
    new ICAL.Timezone(new ICAL.Component(ICAL.parse(ics)))
  );
}

function findTimezone(tzid: string): any {
  if (TIMEZONES.zones[tzid]) {
    return buildTimezone(tzid, TIMEZONES.zones[tzid].ics);
  }

  const alias = TIMEZONES.aliases[tzid];
  if (alias && alias.aliasTo) {
    return findTimezone(alias.aliasTo);
  }

  throw new Error(`Unknown timezone alias: ${tzid}`);
}
