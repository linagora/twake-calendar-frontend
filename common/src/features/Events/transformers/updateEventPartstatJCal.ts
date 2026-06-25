import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'

/**
 * Predicate identifying the ATTENDEE whose PARTSTAT must be updated.
 * Receives the attendee parameters and its (mailto-stripped) calendar address.
 */
export type AttendeeMatcher = (
  params: Record<string, string>,
  calAddress: string
) => boolean

/**
 * Updates the PARTSTAT of a single attendee directly in the fetched VCALENDAR
 * jCal, leaving every other property (DTSTART, VTIMEZONE, custom props, ...)
 * untouched. This avoids regenerating the event from the parsed CalendarEvent
 * model, which is lossy: when the in-memory timezone is missing, regeneration
 * silently rewrites DTSTART to UTC and drops the TZID parameter (see #1031).
 *
 * When `recurrenceId` is provided the patch is restricted to the single VEVENT
 * whose RECURRENCE-ID matches that value (solo recurring-instance RSVP, see
 * #1088). Omit it to update every VEVENT (non-recurring events).
 *
 * Returns the patched jCal, or `null` when no matching attendee was found so
 * the caller can fall back to the regeneration path (e.g. adding oneself as a
 * brand-new attendee).
 */
export function updateEventPartstatJCal(
  jcal: VCalComponent,
  matchAttendee: AttendeeMatcher,
  partstat: string,
  recurrenceId?: string
): VCalComponent | null {
  let matched = false

  const [name, props, components] = jcal as [
    string,
    VObjectProperty[],
    VCalComponent[]
  ]

  const updatedComponents = (components ?? []).map(
    (component: VCalComponent): VCalComponent => {
      if (!Array.isArray(component) || component[0] !== 'vevent') {
        return component
      }

      if (recurrenceId !== undefined) {
        const veventProps = component[1] as VObjectProperty[]
        const ridProp = veventProps.find(([k]) => k === 'recurrence-id')
        if (!ridProp) {
          return component
        }
        const veventRid = normalizeId(ridProp[3] as string)
        if (veventRid !== normalizeId(recurrenceId)) {
          return component
        }
      }

      const properties = component[1] as VObjectProperty[]
      const updatedProperties = properties.map(
        (prop: VObjectProperty): VObjectProperty => {
          if (prop[0] !== 'attendee') {
            return prop
          }

          const params = (prop[1] ?? {}) as Record<string, string>
          const calAddress = ((prop[3] as string | undefined) ?? '').replace(
            /^mailto:/i,
            ''
          )

          if (matchAttendee(params, calAddress)) {
            matched = true
            return [prop[0], { ...params, partstat }, prop[2], prop[3]]
          }
          return prop
        }
      )

      return [component[0], updatedProperties, component[2]] as VCalComponent
    }
  )

  if (!matched) {
    return null
  }

  return [name, props, updatedComponents] as VCalComponent
}

const normalizeId = (id: unknown): string =>
  ((id ?? '') as string).replace(/Z$/, '')
