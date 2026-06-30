import { CalendarEvent } from '@common/types/EventsTypes'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { formatDateTimeToICal, formatDateToICal } from './formatDateToICal'

export function makeVevent(
  event: CalendarEvent,
  tzid: string,
  isMasterEvent?: boolean
): [string, unknown[]] {
  let isOccurrence = false
  const vevent: [string, unknown[]] = [
    'vevent',
    [
      ['uid', {}, 'text', extractEventBaseUuid(event.uid)],
      ['transp', {}, 'text', event.transp ?? 'OPAQUE'],
      [
        'dtstart',
        event.allday ? {} : { tzid },
        event.allday ? 'date' : 'date-time',
        event.allday
          ? formatDateToICal(new Date(event.start))
          : formatDateTimeToICal(new Date(event.start), tzid)
      ],
      ['class', {}, 'text', event.class ?? 'PUBLIC'],
      ['sequence', {}, 'integer', event.sequence ?? 1],
      [
        'x-openpaas-videoconference',
        {},
        'unknown',
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

  if (event.end) {
    vevent[1].push([
      'dtend',
      event.allday ? {} : { tzid },
      event.allday ? 'date' : 'date-time',
      event.allday
        ? formatDateToICal(new Date(event.end))
        : formatDateTimeToICal(new Date(event.end), tzid)
    ])
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
      event.allday ? {} : { tzid },
      event.allday ? 'date' : 'date-time',
      event.allday
        ? formatDateToICal(new Date(event.recurrenceId))
        : formatDateTimeToICal(new Date(event.recurrenceId), tzid)
    ])
  }
  if (event.description) {
    vevent[1].push(['description', {}, 'text', event.description])
  }
  if (event.repetition?.freq && !isOccurrence) {
    vevent[1].push(event.repetition.asJcal(event.allday ?? false, tzid))
  }

  event.attendee.forEach(att => {
    vevent[1].push(att.asJcal())
  })

  if (event.exdates && event.exdates.length > 0) {
    event.exdates.forEach(ex => {
      vevent[1].push([
        'exdate',
        event.allday ? {} : { tzid },
        event.allday ? 'date' : 'date-time',
        event.allday
          ? formatDateToICal(new Date(ex))
          : formatDateTimeToICal(new Date(ex), tzid)
      ])
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
