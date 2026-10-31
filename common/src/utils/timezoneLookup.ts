import { TIMEZONES, TimeZones } from './timezone-data'

export type TimezoneData = TimeZones['zones'][string]

/**
 * The data of a known zone. Only own entries count: a TZID named like an
 * Object.prototype member (`toString`, `constructor`...) is an unknown zone,
 * not the inherited function.
 */
export function findTimezoneData(name: string): TimezoneData | undefined {
  return Object.hasOwn(TIMEZONES.zones, name)
    ? TIMEZONES.zones[name]
    : undefined
}

/** The zone an alias points to, under the same own-entry rule. */
export function findTimezoneAlias(name: string): string | undefined {
  return Object.hasOwn(TIMEZONES.aliases, name)
    ? TIMEZONES.aliases[name].aliasTo
    : undefined
}
