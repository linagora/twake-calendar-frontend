import { CalendarEvent } from '@common/types/EventsTypes'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { formatDateTimeToICal, formatDateToICal } from './formatDateToICal'

/**
 * The parameters, type and value of a DTSTART-like property. A zone unknown to
 * both moment and ical.js is written as UTC, which must not carry a TZID.
 */
function dateValue(
  event: CalendarEvent,
  date: string,
  tzid: string | undefined
): [Record<string, string>, string, string] {
  if (event.allday) {
    return [{}, 'date', formatDateToICal(new Date(date))]
  }
  const value = formatDateTimeToICal(new Date(date), tzid)
  return tzid && !value.endsWith('Z')
    ? [{ tzid }, 'date-time', value]
    : [{}, 'date-time', value]
}

function sameInstant(a: string, b: string): boolean {
  return new Date(a).getTime() === new Date(b).getTime()
}

/**
 * A timed event stored without DTEND nor DURATION ends when it starts
 * (RFC 5545 §3.6.1). Its end in the model is made up for display: it is not
 * written back while the dates stay as they were read. See #2108.
 */
function hasUntouchedImplicitEnd(event: CalendarEvent): boolean {
  const implicit = event.implicitEnd
  return (
    !!implicit &&
    !event.allday &&
    !!event.end &&
    sameInstant(event.start, implicit.start) &&
    sameInstant(event.end, implicit.end)
  )
}

/** Without a `tzid`, the date-times are written in UTC. */
export function makeVevent(
  event: CalendarEvent,
  tzid?: string,
  isMasterEvent?: boolean
): [string, unknown[]] {
  let isOccurrence = false
  const vevent: [string, unknown[]] = [
    'vevent',
    [
      ['uid', {}, 'text', extractEventBaseUuid(event.uid)],
      ['transp', {}, 'text', event.transp ?? 'OPAQUE'],
      ['dtstart', ...dateValue(event, event.start, tzid)],
      ['class', {}, 'text', event.class ?? 'PUBLIC'],
      ['sequence', {}, 'integer', event.sequence ?? 1],
      [
        'x-openpaas-videoconference',
        {},
        'uri',
        event.x_openpass_videoconference ?? null
      ],
      ['summary', {}, 'text', event.title ?? ''],
      ['dtstamp', {}, 'date-time', formatDateTimeToICal(new Date())]
    ]
  ]
  // Collect VALARM subcomponents
  const valarms = event.alarms?.asJcal() ?? []
  if (valarms.length > 0) {
    vevent.push(valarms)
  }

  if (event.end && !hasUntouchedImplicitEnd(event)) {
    vevent[1].push(['dtend', ...dateValue(event, event.end, tzid)])
  }
  if (event.organizer) {
    vevent[1].push(event.organizer.asJcal())
  }
  if (event.location) {
    vevent[1].push(['location', {}, 'text', event.location])
  }
  if (event.recurrenceId && !isMasterEvent) {
    isOccurrence = true
    vevent[1].push([
      'recurrence-id',
      ...dateValue(event, event.recurrenceId, tzid)
    ])
  }
  if (event.status) {
    vevent[1].push(['status', {}, 'text', event.status])
  }
  if (event.description) {
    vevent[1].push(['description', {}, 'text', event.description])
  }
  if (event.repetition?.freq && !isOccurrence) {
    vevent[1].push(event.repetition.asJcal())
  }

  event.attendee.forEach(att => {
    vevent[1].push(att.asJcal())
  })

  if (event.exdates && event.exdates.length > 0) {
    event.exdates.forEach(ex => {
      vevent[1].push(['exdate', ...dateValue(event, ex, tzid)])
    })
  }

  event?.attach?.forEach(attachment => {
    vevent[1].push(attachment.asJcal())
  })

  if (event.passthroughProps?.length) {
    const existingKeys = new Set(
      vevent[1].map(p => (p as [string])[0].toLowerCase())
    )
    for (const prop of event.passthroughProps) {
      if (!existingKeys.has(prop[0].toLowerCase())) {
        vevent[1].push(prop)
      }
    }
  }

  return vevent
}
