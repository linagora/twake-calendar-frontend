import { AppDispatch } from '@common/app/store'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { resolveEventISORange } from '@common/components/Event/utils/dateRangeUtils'
import { buildDelegatedEventURL } from '@common/features/Events/utils/buildDelegatedEventURL'
import {
  clearEventFormTempData,
  saveEventFormDataToTemp,
  showErrorNotification
} from '@common/utils/eventFormTempStorage'
import { assertThunkSuccess } from '@common/utils/assertThunkSuccess'
import { putEvent } from '@common/features/Calendars/CalendarSlice'
import { Resource } from '@common/components/Attendees/ResourceSearch'

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
    repetition: values.repetition,
    organizer,
    timezone: values.timezone,
    attendee: [
      {
        cn: organizer?.cn ?? '',
        cal_address: organizer?.cal_address ?? '',
        partstat: 'ACCEPTED',
        rsvp: 'FALSE',
        role: 'CHAIR',
        cutype: 'INDIVIDUAL'
      }
    ],
    transp: values.busy,
    sequence: 1,
    color: targetCalendar?.color,
    alarm: { trigger: values.alarm, action: 'EMAIL' },
    x_openpass_videoconference: values.meetingLink || undefined
  }

  // Append resources as attendees
  values.selectedResources.forEach((resource: Resource) => {
    if (!newEvent.attendee) newEvent.attendee = []
    newEvent.attendee.push({
      cn: resource?.displayName ?? '',
      cal_address: resource?.email ?? '',
      partstat: 'NEEDS-ACTION',
      rsvp: 'TRUE',
      role: 'REQ-PARTICIPANT',
      cutype: 'RESOURCE'
    })
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
