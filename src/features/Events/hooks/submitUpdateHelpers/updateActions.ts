import { AppDispatch } from '@/app/store'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import {
  clearEventFormTempData,
  saveEventFormDataToTemp,
  showErrorNotification
} from '@/utils/eventFormTempStorage'
import { assertThunkSuccess } from '@/utils/assertThunkSuccess'
import {
  putEventAsync,
  updateEventInstanceAsync,
  updateSeriesAsync
} from '@/features/Calendars/services'
import {
  clearFetchCache,
  removeEvent,
  updateEventLocal
} from '@/features/Calendars/CalendarSlice'
import { deleteEvent, putEvent } from '@/features/Events/EventApi'
import { detectRecurringEventChanges } from '@/features/Events/utils/detectRecurringEventChanges'
import { extractEventBaseUuid } from '@/utils/extractEventBaseUuid'
import { resolveTimezone } from '@/utils/timezone'
import {
  RecurringUpdateContext,
  UpdateHelperContext,
  HandleUpdateErrorParams
} from './types'

export function handleUpdateError({
  error,
  values,
  tempContext,
  eventId,
  calId,
  typeOfAction,
  defaultMessage
}: HandleUpdateErrorParams): void {
  const errorObj = error as { message?: string }
  saveEventFormDataToTemp('update', {
    ...values,
    resources: values.selectedResources,
    ...tempContext,
    fromError: true
  })
  showErrorNotification(errorObj.message || defaultMessage)
  window.dispatchEvent(
    new CustomEvent('eventModalError', {
      detail: { type: 'update', eventId, calId, typeOfAction }
    })
  )
}

export async function handleConvertRecurringToSingle({
  dispatch,
  event,
  values,
  tempContext,
  targetCalendar,
  calId,
  newCalId,
  newEvent,
  eventId,
  typeOfAction,
  getSeriesInstances
}: RecurringUpdateContext & { newCalId: string }): Promise<void> {
  const seriesSnap = getSeriesInstances()
  let hasRemovedSeries = false
  let createdUID: string | null = null

  try {
    const baseUID = extractEventBaseUuid(event.uid)
    await deleteSeriesInstancesFromServer(targetCalendar, baseUID)
    await new Promise(resolve => setTimeout(resolve, 100))

    const targetCalId = newCalId || calId
    const newUID = crypto.randomUUID()
    const finalNewEvent = {
      ...newEvent,
      uid: newUID,
      URL: `/calendars/${targetCalId}/${newUID}.ics`,
      sequence: 1,
      recurrenceId: undefined
    }

    await putEvent(finalNewEvent, targetCalendar.owner?.emails?.[0])
    dispatch(updateEventLocal({ calId: targetCalId, event: finalNewEvent }))
    createdUID = finalNewEvent.uid
    dispatch(clearFetchCache(targetCalId))

    removeSeriesFromUI(dispatch, calId, Object.keys(seriesSnap))
    hasRemovedSeries = true

    clearEventFormTempData('update')
  } catch (err) {
    handleUpdateError({
      error: err,
      values,
      tempContext,
      eventId,
      calId,
      typeOfAction,
      defaultMessage: 'Failed to convert recurring event. Please try again.'
    })
    if (createdUID) {
      const targetCalId = newCalId || calId
      dispatch(removeEvent({ calendarUid: targetCalId, eventUid: createdUID }))
    }
    if (hasRemovedSeries) {
      restoreSeriesInUI(dispatch, calId, Object.values(seriesSnap))
    }
  }
}

export async function handleUpdateRecurringSolo({
  dispatch,
  calId,
  newEvent,
  targetCalendar,
  recurrenceId
}: UpdateHelperContext & { recurrenceId: string }): Promise<void> {
  dispatch(updateEventLocal({ calId, event: { ...newEvent, recurrenceId } }))
  const result = await dispatch(
    updateEventInstanceAsync({
      cal: targetCalendar,
      event: { ...newEvent, recurrenceId }
    })
  )
  await assertThunkSuccess(result)
  clearEventFormTempData('update')
}

export async function handleUpdateRecurringSeries(
  params: RecurringUpdateContext
): Promise<void> {
  const { event, values, masterEvent } = params
  const changes = detectRecurringEventChanges(
    event,
    {
      repetition: values.repetition,
      timezone: values.timezone,
      allday: values.allday,
      start: values.start,
      end: values.end
    },
    masterEvent || null,
    resolveTimezone
  )

  if (changes.repetitionRulesChanged) {
    await handleUpdateRecurringSeriesWithRuleChange(params)
  } else {
    await handleUpdateRecurringSeriesMetadataOnly(params)
  }
}

export async function handleUpdateNonRecurring({
  dispatch,
  event,
  values,
  targetCalendar,
  newEvent,
  calId,
  newCalId
}: UpdateHelperContext & {
  calList: Record<string, Calendar>
  event: CalendarEvent
  newCalId: string
}): Promise<void> {
  if (!event.repetition?.freq && values.repetition?.freq) {
    const oldUID = event.uid
    const result = await dispatch(
      putEventAsync({ cal: targetCalendar, newEvent })
    )
    await assertThunkSuccess(result)
    dispatch(removeEvent({ calendarUid: calId, eventUid: oldUID }))
    dispatch(clearFetchCache(calId))
    clearEventFormTempData('update')
  } else if (newCalId === calId) {
    const result = await dispatch(
      putEventAsync({ cal: targetCalendar, newEvent })
    )
    await assertThunkSuccess(result)
    clearEventFormTempData('update')
  }
}

// ---------- Private Helpers for Complex Actions ----------
async function deleteSeriesInstancesFromServer(
  targetCalendar: Calendar,
  baseUID: string
): Promise<void> {
  const events = targetCalendar.events || {}
  const uniqueURLs = new Set(
    Object.keys(events)
      .filter(eid => extractEventBaseUuid(eid) === baseUID)
      .map(eid => events[eid]?.URL)
      .filter(Boolean)
  )

  await Promise.all(Array.from(uniqueURLs).map(safeDeleteEvent))
}

async function safeDeleteEvent(url: string): Promise<void> {
  try {
    await deleteEvent(url)
  } catch (e) {
    const err = e as { response?: { status?: number }; message?: string }
    const is404 =
      err.response?.status === 404 ||
      err.message?.includes('404') ||
      err.message?.includes('Not Found')
    if (!is404) console.error(`Failed to delete event file: ${err.message}`)
  }
}

function removeSeriesFromUI(
  dispatch: AppDispatch,
  calId: string,
  eventIds: string[]
): void {
  eventIds.forEach(eid =>
    dispatch(removeEvent({ calendarUid: calId, eventUid: eid }))
  )
}

function restoreSeriesInUI(
  dispatch: AppDispatch,
  calId: string,
  events: CalendarEvent[]
): void {
  events.forEach(inst => dispatch(updateEventLocal({ calId, event: inst })))
}

function updateSeriesInstancesLocally(
  dispatch: AppDispatch,
  calId: string,
  instances: Record<string, CalendarEvent>,
  newEvent: CalendarEvent
): void {
  Object.keys(instances).forEach(eid => {
    const inst = instances[eid]
    dispatch(
      updateEventLocal({
        calId,
        event: {
          ...inst,
          title: newEvent.title,
          description: newEvent.description,
          location: newEvent.location,
          class: newEvent.class,
          transp: newEvent.transp,
          attendee: newEvent.attendee,
          alarm: newEvent.alarm,
          x_openpass_videoconference: newEvent.x_openpass_videoconference
        }
      })
    )
  })
}

async function handleUpdateRecurringSeriesWithRuleChange({
  dispatch,
  calId,
  newEvent,
  baseUID,
  targetCalendar,
  getSeriesInstances
}: RecurringUpdateContext): Promise<void> {
  const seriesSnap = getSeriesInstances()
  try {
    removeSeriesFromUI(dispatch, calId, Object.keys(seriesSnap))
    const masterForUpdate = {
      ...newEvent,
      uid: baseUID,
      recurrenceId: undefined
    }
    const result = await dispatch(
      updateSeriesAsync({
        cal: targetCalendar,
        event: masterForUpdate,
        removeOverrides: true
      })
    )
    await assertThunkSuccess(result)
    dispatch(clearFetchCache(calId))
    clearEventFormTempData('update')
  } catch (seriesError) {
    restoreSeriesInUI(dispatch, calId, Object.values(seriesSnap))
    throw seriesError
  }
}

async function handleUpdateRecurringSeriesMetadataOnly({
  dispatch,
  calId,
  newEvent,
  baseUID,
  targetCalendar,
  getSeriesInstances
}: RecurringUpdateContext): Promise<void> {
  updateSeriesInstancesLocally(dispatch, calId, getSeriesInstances(), newEvent)
  const masterForUpdate = {
    ...newEvent,
    uid: baseUID,
    recurrenceId: undefined
  }
  const result = await dispatch(
    updateSeriesAsync({
      cal: targetCalendar,
      event: masterForUpdate,
      removeOverrides: false
    })
  )
  await assertThunkSuccess(result)
  dispatch(clearFetchCache(calId))
  clearEventFormTempData('update')
}
