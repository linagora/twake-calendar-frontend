import { Calendar } from '@/features/Calendars/CalendarTypes'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { EventFormValues } from '@/components/Event/EventFormFields.types'
import { resolveEventISORange } from '@/components/Event/utils/dateRangeUtils'
import { updateAttendeesAfterTimeChange } from '@/features/Events/updateEventHelpers/updateAttendeesAfterTimeChange'
import { extractEventBaseUuid } from '@/utils/extractEventBaseUuid'
import { Resource } from '@/components/Attendees/ResourceSearch'
import { userAttendee } from '@/features/User/models/attendee'
import { PrepareUpdateDataResult, PrepareUpdateDataParams } from './types'

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

export function prepareUpdatedEvent({
  event,
  values,
  startISO,
  endISO,
  timeChanged,
  targetCalendar,
  calId,
  newCalId
}: {
  event: CalendarEvent
  values: EventFormValues
  startISO: string
  endISO: string
  timeChanged: boolean
  targetCalendar: Calendar
  calId: string
  newCalId: string
}): CalendarEvent {
  const currentCalId = newCalId || calId
  const nextSequence = (event.sequence ?? 1) + 1
  const fallbackURL = `/calendars/${currentCalId}/${event.uid}.ics`

  const newEvent: CalendarEvent = {
    ...updateAttendeesAfterTimeChange(event, timeChanged, values.attendees),
    calId: currentCalId,
    title: values.title,
    URL: event.URL ?? fallbackURL,
    start: startISO,
    end: endISO,
    allday: values.allday,
    uid: event.uid,
    description: values.description,
    location: values.location,
    repetition: values.repetition,
    class: values.eventClass,
    organizer: event.organizer,
    timezone: values.timezone,
    transp: values.busy,
    sequence: nextSequence,
    color: targetCalendar?.color,
    alarm: { trigger: values.alarm, action: 'EMAIL' },
    x_openpass_videoconference: values.meetingLink || undefined
  }

  if (values.selectedResources?.length) {
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

    return {
      cn: displayName,
      cal_address: resource?.email ?? '',
      partstat,
      rsvp: 'TRUE',
      role: 'REQ-PARTICIPANT',
      cutype: 'RESOURCE'
    }
  })
}

export function prepareUpdateData({
  event,
  values,
  calList,
  showMore,
  calId,
  eventId,
  typeOfAction
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

  const timeChanged = hasEventTimeChanged(event, startISO, endISO)
  const newCalId = values.calendarid

  const newEvent = prepareUpdatedEvent({
    event,
    values,
    startISO,
    endISO,
    timeChanged,
    targetCalendar,
    calId,
    newCalId
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
