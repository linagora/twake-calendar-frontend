import { AppDispatch } from '@common/app/store'
import { Resource } from '@common/components/Attendees/ResourceSearch'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { resolveEventISORange } from '@common/components/Event/utils/dateRangeUtils'
import { putEvent } from '@common/features/Calendars/CalendarSlice'
import { buildDelegatedEventURL } from '@common/features/Events/utils/buildDelegatedEventURL'
import { userAttendee } from '@common/features/User/models/attendee'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { RepetitionObject } from '@common/types/Repetition'
import { Valarms } from '@common/types/Valarms'
import { assertThunkSuccess } from '@common/utils/assertThunkSuccess'
import {
  clearEventFormTempData,
  saveEventFormDataToTemp,
  showErrorNotification
} from '@common/utils/eventFormTempStorage'
import { getAlarmAttendees } from '../submitUpdateHelpers/utils'
import { userOrganiser } from '@common/features/User/userDataTypes'

function buildAttendees({
  organizer,
  resources,
  attendees
}: {
  organizer?: userOrganiser
  resources: Resource[]
  attendees: CalendarEvent['attendee']
}): CalendarEvent['attendee'] {
  return [
    userAttendee.fromOrganizer(organizer),
    ...resources.map(resource => userAttendee.fromResource(resource)),
    ...(attendees ?? [])
  ]
}

function buildNewEvent({
  values,
  targetCalendar,
  showMore,
  organizer,
  newEventUID
}: {
  values: EventFormValues
  targetCalendar: Calendar
  showMore: boolean
  organizer?: userOrganiser
  newEventUID: string
}): CalendarEvent {
  const newEventURL = `/calendars/${targetCalendar.id}/${newEventUID}.ics`
  const { startISO, endISO } = resolveEventISORange({
    start: values.start,
    end: values.end,
    allday: values.allday,
    timezone: values.timezone,
    showMore,
    hasEndDateChanged: values.hasEndDateChanged
  })

  return {
    calId: targetCalendar.id,
    title: values.title,
    URL: targetCalendar.delegated
      ? buildDelegatedEventURL(targetCalendar, newEventURL)
      : newEventURL,
    start: startISO,
    end: endISO,
    allday: values.allday,
    uid: newEventUID,
    description: values.description,
    location: values.location,
    class: values.eventClass,
    repetition: RepetitionObject.fromFormValues(values.repetition, {
      allday: values.allday,
      timezone: values.timezone
    }),
    organizer,
    timezone: values.timezone,
    attendee: buildAttendees({
      organizer,
      resources: values.selectedResources,
      attendees: values.attendees
    }),
    transp: values.busy,
    sequence: 1,
    color: targetCalendar?.color,
    alarms: Valarms.fromFormValues(values.alarms, {
      attendees: getAlarmAttendees(values, targetCalendar),
      summary: values.title
    }),
    x_openpass_videoconference: values.meetingLink || undefined
  }
}

function handleCreateEventError(values: EventFormValues, error: unknown): void {
  const errorObj = error as { message?: string }
  saveEventFormDataToTemp('create', {
    ...values,
    resources: values.selectedResources,
    fromError: true
  })
  showErrorNotification(
    errorObj.message || 'Failed to create event. Please try again.'
  )
  window.dispatchEvent(
    new CustomEvent('eventModalError', { detail: { type: 'create' } })
  )
}

export async function handleCreateEvent({
  dispatch,
  values,
  targetCalendar,
  showMore,
  organizer,
  onClose
}: {
  dispatch: AppDispatch
  values: EventFormValues
  targetCalendar: Calendar
  showMore: boolean
  organizer?: userOrganiser
  onClose: (refresh?: boolean) => void
}): Promise<void> {
  const newEvent = buildNewEvent({
    values,
    targetCalendar,
    showMore,
    organizer,
    newEventUID: crypto.randomUUID()
  })

  onClose(true)

  try {
    const result = await dispatch(putEvent({ cal: targetCalendar, newEvent }))
    await assertThunkSuccess(result)
    clearEventFormTempData('create')
  } catch (error) {
    handleCreateEventError(values, error)
  }
}
