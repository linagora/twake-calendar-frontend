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
  organizer?: { cn: string; cal_address: string }
  onClose: (refresh?: boolean) => void
}): Promise<void> {
  const newEventUID = crypto.randomUUID()
  const newEventURL = `/calendars/${targetCalendar.id}/${newEventUID}.ics`

  const { startISO, endISO } = resolveEventISORange({
    start: values.start,
    end: values.end,
    allday: values.allday,
    timezone: values.timezone,
    showMore,
    hasEndDateChanged: values.hasEndDateChanged
  })

  const newEvent: CalendarEvent = {
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
    repetition: values.repetition?.freq
      ? new RepetitionObject(values.repetition)
      : undefined,
    organizer,
    timezone: values.timezone,
    attendee: [userAttendee.fromOrganizer(organizer)],
    transp: values.busy,
    sequence: 1,
    color: targetCalendar?.color,
    alarms: Valarms.fromFormValues(values.alarms, {
      attendees: getAlarmAttendees(values, targetCalendar),
      summary: values.title
    }),
    x_openpass_videoconference: values.meetingLink || undefined
  }

  // Append resources as attendees
  values.selectedResources.forEach((resource: Resource) => {
    if (!newEvent.attendee) newEvent.attendee = []
    newEvent.attendee.push(userAttendee.fromResource(resource))
  })

  // Append human attendees
  if (values.attendees.length > 0) {
    if (!newEvent.attendee) newEvent.attendee = []
    newEvent.attendee = newEvent.attendee.concat(values.attendees)
  }

  onClose(true)

  try {
    const result = await dispatch(putEvent({ cal: targetCalendar, newEvent }))
    await assertThunkSuccess(result)
    clearEventFormTempData('create')
  } catch (error) {
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
}
