import { RepetitionRule } from '@common/features/Calendars/types/CalendarData'
import { CalendarEvent } from '@common/types/EventsTypes'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import moment from 'moment'
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
    // event.organizer is typed as userOrganiser, but at runtime it can be a
    // plain object: it originates from state.user.organiserData (initialised
    // as a plain object) and any instance loses its prototype once stored in
    // the Redux store. Re-wrap it so asJcal() is always callable.
    const organizer =
      event.organizer instanceof userOrganiser
        ? event.organizer
        : new userOrganiser(event.organizer)
    vevent[1].push(organizer.asJcal())
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
    const repetitionRule: RepetitionRule = { freq: event.repetition.freq }
    if (event.repetition.interval) {
      repetitionRule.interval = event.repetition.interval
    }
    if (event.repetition.occurrences) {
      repetitionRule.count = event.repetition.occurrences
    }
    if (event.repetition.endDate) {
      repetitionRule.until = formatUntilForRRule(
        event.repetition.endDate,
        event.allday ?? false,
        tzid
      )
    }
    if (
      event.repetition.byday !== null &&
      event.repetition.byday !== undefined
    ) {
      repetitionRule.byday = event.repetition.byday
    }
    if (event.repetition.wkst) {
      repetitionRule.wkst = event.repetition.wkst
    }
    vevent[1].push(['rrule', {}, 'recur', repetitionRule])
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

function formatUntilForRRule(
  endDate: string,
  allday: boolean,
  tzid: string
): string {
  if (allday) {
    return endDate.replace(/-/g, '')
  }

  // Take the date part of endDate, add end of day, convert to UTC
  const datePart = endDate
  const timePart = '23:59:59'

  return moment
    .tz(`${datePart}T${timePart}`, tzid)
    .utc()
    .format('YYYYMMDDTHHmmss[Z]')
}
