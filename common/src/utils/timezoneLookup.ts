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

let caseInsensitiveIndex: Map<string, string> | undefined

function canonicalNames(): Map<string, string> {
  caseInsensitiveIndex ??= new Map(
    // Zones last, so that a zone wins over an alias differing only in case.
    [...Object.keys(TIMEZONES.aliases), ...Object.keys(TIMEZONES.zones)].map(
      name => [name.toLowerCase(), name]
    )
  )
  return caseInsensitiveIndex
}

/**
 * The name of the table a TZID written in another case stands for
 * ("europe/paris" → "Europe/Paris"): moment-timezone reads such a TZID
 * case-insensitively, so the writer must find its zone too. An exact name is
 * kept as given.
 */
export function findCanonicalTimezoneName(name: string): string | undefined {
  if (findTimezoneData(name) || findTimezoneAlias(name)) return name
  return canonicalNames().get(name.toLowerCase())
}
