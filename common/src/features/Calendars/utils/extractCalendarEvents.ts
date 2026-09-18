import { CalDavItem } from '@common/features/Calendars/types/CalendarApiTypes'
import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'
import { parseCalendarEvent } from '@common/features/Events/utils'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { defaultColors } from '@common/utils/defaultColors'
import { resolveTimezoneId } from '@common/utils/timezone'

/**
 * An expanded REPORT normalises every occurrence to UTC and leaves the zone the
 * event was written in to a sibling VTIMEZONE. Reading that component back is
 * the only way the grid learns an event created in Tokyo is a Tokyo event, and
 * not one of the browser.
 */
function bundledTimezone(components: unknown[]): string | undefined {
  const vtimezone = components.find(
    component =>
      Array.isArray(component) &&
      typeof component[0] === 'string' &&
      component[0].toLowerCase() === 'vtimezone'
  ) as VCalComponent | undefined

  const tzid = vtimezone?.[1].find(([key]) => key.toLowerCase() === 'tzid')?.[3]

  return typeof tzid === 'string' ? resolveTimezoneId(tzid) : undefined
}

export function extractCalendarEvents(
  item: CalDavItem,
  options: {
    cal: Calendar
    color?: Record<string, string>
  }
): CalendarEvent[] {
  const data = item.data
  if (!Array.isArray(data)) {
    return []
  }

  // VEVENTS are at index 2
  const vevents = data[2]
  if (!Array.isArray(vevents)) {
    return []
  }

  const eventURL = item._links?.self?.href
  if (!eventURL) {
    return []
  }

  const timezoneOfTheCalendarObject = bundledTimezone(vevents)

  return vevents
    .map(vevent => {
      if (!Array.isArray(vevent)) {
        return null
      }

      // A calendar object can bundle non-event components (typically a
      // VTIMEZONE) alongside its VEVENT(s); only VEVENTs are actual events.
      if (
        typeof vevent[0] !== 'string' ||
        vevent[0].toLowerCase() !== 'vevent'
      ) {
        return null
      }

      const eventProps = vevent[1] as VObjectProperty[]
      if (!Array.isArray(eventProps)) {
        return null
      }

      const valarms = extractValarms(vevent as VCalComponent)

      return parseCalendarEvent({
        data: eventProps,
        color: options?.color ?? defaultColors[0],
        calendar: options.cal,
        eventURL,
        valarms,
        timezoneOfTheCalendarObject
      })
    })
    .filter(Boolean) as CalendarEvent[]
}

function extractValarms(vevent: VCalComponent): VCalComponent[] | undefined {
  const subComponents = vevent[2]
  if (!Array.isArray(subComponents)) {
    return undefined
  }

  const valarmComponent = subComponents.filter(
    component =>
      Array.isArray(component) && component[0].toLowerCase() === 'valarm'
  )

  return valarmComponent
}
