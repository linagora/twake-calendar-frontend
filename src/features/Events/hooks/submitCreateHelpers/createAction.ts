import { AppDispatch } from '@/app/store'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { EventFormValues } from '@/components/Event/EventFormFields.types'
import { resolveEventISORange } from '@/components/Event/utils/dateRangeUtils'
import { buildDelegatedEventURL } from '@/features/Events/utils/buildDelegatedEventURL'
import {
  clearEventFormTempData,
  saveEventFormDataToTemp,
  showErrorNotification
} from '@/utils/eventFormTempStorage'
import { assertThunkSuccess } from '@/utils/assertThunkSuccess'
import { putEventAsync } from '@/features/Calendars/services'
import { Resource } from '@/components/Attendees/ResourceSearch'

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
    const result = await dispatch(
      putEventAsync({ cal: targetCalendar, newEvent })
    )
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
