import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { TIMEZONES } from '@common/utils/timezone-data'
import ICAL from 'ical.js'
import { CounterProposalPayload } from '@common/features/Events/EventDao'
import { CalendarEvent } from '@common/types/EventsTypes'
import { makeTimezone, makeVevent } from '@common/features/Events/utils'

import { resolveTimezone } from '@common/utils/timezone'

import {
  VCalComponent,
  VObjectProperty
} from '@common/features/Calendars/types/CalendarData'

function sanitizePrimitive(val: unknown): string {
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return String(val)
  return typeof val === 'string' ? val : ''
}

function sanitizeParamValue(
  key: string,
  val: unknown
): string | string[] | undefined {
  if (val === undefined || val === null) return undefined

  if (Array.isArray(val)) {
    const isKnownMultiValue = Boolean(
      (
        ICAL.design.defaultSet.param as Record<
          string,
          { multiValue?: string } | undefined
        >
      )[key.toLowerCase()]?.multiValue
    )
    const mapped = val.map(sanitizePrimitive)
    return isKnownMultiValue ? mapped : mapped.join(',')
  }

  return sanitizePrimitive(val)
}

function sanitizeProps(props: VObjectProperty[] = []): VObjectProperty[] {
  return props.map(prop => {
    const [propName, params, type, value] = prop
    if (!params || typeof params !== 'object') return prop

    const sanitizedParams: Record<string, string | string[]> = {}
    for (const [key, val] of Object.entries(params)) {
      const sanitized = sanitizeParamValue(key, val)
      if (sanitized !== undefined) {
        sanitizedParams[key] = sanitized
      }
    }

    return [propName, sanitizedParams, type, value]
  })
}

function sanitizeJCal(component: VCalComponent): VCalComponent {
  const [name, props, subcomponents] = component
  return [name, sanitizeProps(props), (subcomponents || []).map(sanitizeJCal)]
}

export function makeCounterProposalPayload({
  event,
  senderEmail,
  recipientEmail,
  proposedStart,
  proposedEnd,
  message
}: {
  event: CalendarEvent
  senderEmail: string
  recipientEmail: string
  proposedStart: string
  proposedEnd: string
  message?: string
}): CounterProposalPayload {
  const resolvedTz = resolveTimezone(event.timezone || 'Etc/UTC')
  const timezone = TIMEZONES.zones[resolvedTz] ? resolvedTz : 'Etc/UTC'
  const timezoneData = TIMEZONES.zones[resolvedTz] ?? TIMEZONES.zones['Etc/UTC']

  // Build the counter event with proposed dates
  const counterEvent: CalendarEvent = {
    ...event,
    timezone,
    start: proposedStart,
    end: proposedEnd,
    sequence: event.sequence ?? 0
  }
  // Build vevent jCal
  const vevent = makeVevent(
    counterEvent,
    counterEvent.timezone,
    !event.recurrenceId
  )

  if (message) {
    vevent[1].push(['comment', {}, 'text', message])
  }
  // Build vtimezone
  const vtimezone = makeTimezone(timezoneData, counterEvent)

  // Assemble full vcalendar with METHOD:COUNTER
  const jcal: VCalComponent = [
    'vcalendar',
    [
      ['version', {}, 'text', '2.0'],
      ['prodid', {}, 'text', '-//OpenPaaS//OpenPaaS//EN'],
      ['method', {}, 'text', 'COUNTER']
    ],
    [
      vevent as unknown as VCalComponent,
      vtimezone.component.jCal as unknown as VCalComponent
    ]
  ]

  // Serialize to raw ICS
  const counterICS = new ICAL.Component(sanitizeJCal(jcal)).toString()

  const payload: CounterProposalPayload = {
    ical: counterICS,
    sender: senderEmail,
    recipient: recipientEmail,
    uid: extractEventBaseUuid(event.uid),
    sequence: counterEvent.sequence ?? 0,
    method: 'COUNTER'
  }
  return payload
}
