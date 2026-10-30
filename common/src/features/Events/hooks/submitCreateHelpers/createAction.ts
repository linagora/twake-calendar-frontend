import { eventSaved } from '../../eventSaveFeedbackSlice'
import { AppDispatch } from '@common/app/store'
import { Resource } from '@common/components/Attendees/ResourceSearch'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { resolveEventISORange } from '@common/components/Event/utils/dateRangeUtils'
import { putEvent } from '@common/features/Calendars/CalendarSlice'
import { userAttendee } from '@common/features/User/models/attendee'
import { eventDavPath } from '@common/features/Calendars/utils/calendarDavPath'
import { alignStartToWeekdays } from '@common/features/Events/utils/alignStartToWeekdays'
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
import { EventDescriptionBuilder } from '@common/utils/EventDescriptionBuilder'
import { getAlarmAttendees } from '../submitUpdateHelpers/utils'
import { hasNoAttendees } from '@common/utils/hasNoAttendees'
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

export function buildNewEvent({
  values: formValues,
  targetCalendar,
  showMore,
  organizer,
  newEventUID,
  t
}: {
  values: EventFormValues
  targetCalendar: Calendar
  showMore: boolean
  organizer?: userOrganiser
  newEventUID: string
  t?: (key: string) => string
}): CalendarEvent {
  const values = alignStartToWeekdays(formValues)
  const { startISO, endISO } = resolveEventISORange({
    start: values.start,
    end: values.end,
    allday: values.allday,
    timezone: values.timezone,
    showMore,
    hasEndDateChanged: values.hasEndDateChanged
  })

  const isTeamCalendar = Boolean(targetCalendar.owner?.teamCalendar)
  const noAttendees = hasNoAttendees(values.attendees)
  // Don't set organizer for team calendars when there are no attendees
  // (needed for proper ITIP mail routing)
  const shouldSetOrganizer = !(isTeamCalendar && noAttendees)

  return {
    calId: targetCalendar.id,
    title: values.title.trim(),
    URL: eventDavPath(targetCalendar, newEventUID),
    start: startISO,
    end: endISO,
    allday: values.allday,
    uid: newEventUID,
    description: new EventDescriptionBuilder(
      values.description,
      values.attachments
    )
      .withFooter(values.meetingLink, t)
      .buildHtml(),
    location: values.location,
    class: values.eventClass,
    repetition: RepetitionObject.fromFormValues(values.repetition, {
      allday: values.allday,
      timezone: values.timezone
    }),
    organizer: shouldSetOrganizer ? organizer : undefined,
    timezone: values.timezone,
    attendee: shouldSetOrganizer
      ? buildAttendees({
          organizer,
          resources: values.selectedResources,
          attendees: values.attendees
        })
      : [],
    transp: values.busy,
    sequence: 1,
    color: targetCalendar?.color,
    alarms: Valarms.fromFormValues(values.alarms, {
      attendees: getAlarmAttendees(values, targetCalendar),
      summary: values.title.trim()
    }),
    x_openpass_videoconference: values.meetingLink || undefined,
    attach:
      values.attachments && values.attachments.length > 0
        ? values.attachments
        : undefined
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
  onClose,
  t
}: {
  dispatch: AppDispatch
  values: EventFormValues
  targetCalendar: Calendar
  showMore: boolean
  organizer?: userOrganiser
  onClose: (refresh?: boolean) => void
  t?: (key: string) => string
}): Promise<void> {
  const newEvent = buildNewEvent({
    values,
    targetCalendar,
    showMore,
    organizer,
    newEventUID: crypto.randomUUID(),
    t
  })

  onClose(true)

  try {
    const result = await dispatch(putEvent({ cal: targetCalendar, newEvent }))
    await assertThunkSuccess(result)
    clearEventFormTempData('create')
    dispatch(eventSaved(newEvent))
  } catch (error) {
    handleCreateEventError(values, error)
  }
}
