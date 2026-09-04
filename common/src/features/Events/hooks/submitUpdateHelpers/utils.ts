import { Resource } from '@common/components/Attendees/ResourceSearch'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { resolveEventISORange } from '@common/components/Event/utils/dateRangeUtils'
import { updateAttendeesAfterTimeChange } from '@common/features/Events/updateEventHelpers/updateAttendeesAfterTimeChange'
import { userAttendee } from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'
import { VAlarm } from '@common/types/VAlarm'
import { Valarms } from '@common/types/Valarms'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import { EventDescriptionBuilder } from '@common/utils/EventDescriptionBuilder'
import { rewriteAttendeesForOrganizerChange } from '@common/features/Events/updateEventHelpers/moveEventBetweenCalendars'
import {
  PrepareUpdateDataParams,
  PrepareUpdateDataResult,
  PrepareUpdatedEventParams
} from './types'
import { hasNoAttendees } from '@common/utils/hasNoAttendees'

export function getAlarmAttendees(
  values: EventFormValues,
  targetCalendar: Calendar
): userAttendee[] | undefined {
  const attendees = values.attendees || []

  const ownerEmail = targetCalendar.owner?.emails?.[0]
  if (ownerEmail) {
    const ownerAttendee = userAttendee.fromEmailField(ownerEmail)
    if (ownerAttendee) {
      return [ownerAttendee, ...attendees]
    }
  }

  return attendees.length > 0 ? attendees : undefined
}
export function getSeriesInstances(
  targetCalendar: Calendar,
  baseUID: string
): Record<string, CalendarEvent> {
  const instances: Record<string, CalendarEvent> = {}
  const seriesEvents = targetCalendar.events || {}
  Object.keys(seriesEvents).forEach(eid => {
    const instance = seriesEvents[eid]
    if (instance && extractEventBaseUuid(eid) === baseUID) {
      instances[eid] = { ...instance }
    }
  })
  return instances
}

export function buildUpdatedAlarms(
  values: EventFormValues,
  targetCalendar: Calendar
): Valarms {
  const alarmAttendees = getAlarmAttendees(values, targetCalendar)

  return Valarms.fromList(
    values.alarms.getAlarms().map(alarm => {
      if (alarm.attendees && alarm.attendees.length > 0) {
        return alarm // Preserve existing attendees from merge
      }
      // New alarm without attendees - add defaults
      return new VAlarm({
        uid: alarm.uid,
        trigger: alarm.trigger,
        action: alarm.action,
        attendees: alarmAttendees,
        summary: values.title,
        description: alarm.description
      })
    })
  )
}

function getUpdatedDescription(
  values: EventFormValues,
  t?: (key: string) => string
): string {
  return new EventDescriptionBuilder(values.description, values.attachments)
    .withFooter(values.meetingLink || null, t)
    .buildHtml()
}

function getNextSequence(sequence?: number): number {
  return (sequence ?? 1) + 1
}

function getEventURL(
  url: string | undefined,
  calId: string,
  uid: string
): string {
  return url ?? `/calendars/${calId}/${uid}.ics`
}

function getEventAttachments<T>(attachments?: T[]): T[] | undefined {
  return attachments && attachments.length > 0 ? attachments : undefined
}

function computeFinalAttendees(
  baseAttendees: userAttendee[],
  organizer: PrepareUpdatedEventParams['organizer'],
  existingOrganizer: CalendarEvent['organizer']
): userAttendee[] {
  if (organizer && organizer.cal_address !== existingOrganizer?.cal_address) {
    return rewriteAttendeesForOrganizerChange(
      baseAttendees,
      existingOrganizer,
      organizer
    )
  }
  return baseAttendees
}

export function prepareUpdatedEvent({
  event,
  values,
  organizer,
  startISO,
  endISO,
  timeChanged,
  targetCalendar,
  calId,
  newCalId,
  t
}: PrepareUpdatedEventParams): CalendarEvent {
  const currentCalId = newCalId || calId

  const isTeamCalendar = Boolean(targetCalendar.owner?.teamCalendar)
  const noAttendees = hasNoAttendees(values.attendees)

  // Don't set organizer for team calendars when there are no attendees
  // (needed for proper ITIP mail routing)
  const shouldSetOrganizer = !(isTeamCalendar && noAttendees)
  const finalOrganizer = shouldSetOrganizer
    ? (organizer ?? event.organizer)
    : undefined

  const baseAttendees =
    updateAttendeesAfterTimeChange(event, timeChanged, values.attendees)
      .attendee ?? []
  const finalAttendees = shouldSetOrganizer
    ? computeFinalAttendees(baseAttendees, organizer, event.organizer)
    : []

  const newEvent: CalendarEvent = {
    ...updateAttendeesAfterTimeChange(event, timeChanged, values.attendees),
    calId: currentCalId,
    title: values.title,
    URL: getEventURL(event.URL, currentCalId, event.uid),
    start: startISO,
    end: endISO,
    allday: values.allday,
    uid: event.uid,
    description: getUpdatedDescription(values, t),
    location: values.location,
    repetition: RepetitionObject.fromFormValues(values.repetition, {
      allday: values.allday,
      timezone: values.timezone
    }),
    class: values.eventClass,
    organizer: finalOrganizer,
    attendee: finalAttendees,
    timezone: values.timezone,
    transp: values.busy,
    sequence: getNextSequence(event.sequence),
    color: targetCalendar?.color,
    alarms: buildUpdatedAlarms(values, targetCalendar),
    x_openpass_videoconference: values.meetingLink || undefined,
    attach: getEventAttachments(values.attachments)
  }

  if (values.selectedResources && values.selectedResources.length > 0) {
    const resourceAttendees = mapResourcesToAttendees(
      values.selectedResources,
      event.attendee || []
    )
    newEvent.attendee = [...(newEvent.attendee || []), ...resourceAttendees]
  }

  return newEvent
}

function mapResourcesToAttendees(
  resources: Resource[],
  existingAttendees: userAttendee[]
): userAttendee[] {
  return resources.map(resource => {
    const displayName = resource?.displayName ?? ''
    const partstat =
      existingAttendees.find(
        a => a.cutype === 'RESOURCE' && a.cn === displayName
      )?.partstat || 'NEEDS-ACTION'

    return userAttendee.fromResource(resource).withPartStat(partstat)
  })
}

export function prepareUpdateData({
  event,
  values,
  organizer,
  calList,
  showMore,
  calId,
  eventId,
  typeOfAction,
  masterEvent,
  t
}: PrepareUpdateDataParams): PrepareUpdateDataResult | null {
  const targetCalendar = calList[values.calendarid]
  if (!targetCalendar) return null

  const [baseUID, recurrenceId] = event.uid.split('/')

  const { startISO, endISO } = resolveEventISORange({
    start: values.start,
    end: values.end,
    allday: values.allday,
    timezone: values.timezone,
    showMore,
    hasEndDateChanged: values.hasEndDateChanged
  })

  const referenceEvent =
    typeOfAction === 'all' && masterEvent ? masterEvent : event
  const timeChanged = hasEventTimeChanged(referenceEvent, startISO, endISO)
  const newCalId = values.calendarid

  const newEvent = prepareUpdatedEvent({
    event,
    values,
    organizer,
    startISO,
    endISO,
    timeChanged,
    targetCalendar,
    calId,
    newCalId,
    t
  })

  return {
    targetCalendar,
    baseUID,
    recurrenceId,
    newEvent,
    tempContext: { eventId, calId, typeOfAction },
    getSeriesInstances: () => getSeriesInstances(targetCalendar, baseUID),
    eventId,
    isConvertingRecurringToSingle: checkIsConvertingRecurringToSingle(
      recurrenceId,
      typeOfAction,
      event,
      values
    ),
    newCalId
  }
}

function hasEventTimeChanged(
  event: CalendarEvent,
  startISO: string,
  endISO: string
): boolean {
  return (
    new Date(event.start).getTime() !== new Date(startISO).getTime() ||
    new Date(event?.end ?? '').getTime() !== new Date(endISO).getTime()
  )
}

function checkIsConvertingRecurringToSingle(
  recurrenceId: string | undefined,
  typeOfAction: string | undefined,
  event: CalendarEvent,
  values: EventFormValues
): boolean {
  return (
    !!recurrenceId &&
    typeOfAction === 'all' &&
    !!event.repetition?.freq &&
    !values.repetition.freq
  )
}
