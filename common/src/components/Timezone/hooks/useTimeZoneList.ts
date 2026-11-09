import {
  browserDefaultTimeZone,
  getTimezoneOffset,
  isValidTimeZone,
  resolveTimezone
} from '@common/utils/timezone'
import { TIMEZONES } from '@common/utils/timezone-data'
import { useMemo } from 'react'

/**
 * The bundled zones, plus the browser one when our data lacks it (a zone
 * created or renamed since, like Europe/Kyiv): it stays selectable by name.
 */
const listZones = (browserTz: string): string[] => {
  const knownZones = Object.keys(TIMEZONES.zones)
  const missingBrowserZone =
    !knownZones.includes(browserTz) && isValidTimeZone(browserTz)
      ? [browserTz]
      : []
  return [...knownZones, ...missingBrowserZone].sort()
}

export function useTimeZoneList(): {
  zones: string[]
  browserTz: string
  getTimezoneOffset: (tzName: string, date?: Date) => string
} {
  return useMemo(() => {
    const browserTz = resolveTimezone(browserDefaultTimeZone)

    return { zones: listZones(browserTz), browserTz, getTimezoneOffset }
  }, [])
}
