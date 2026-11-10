import { eventSaved } from '../../eventSaveFeedbackSlice'
import { AppDispatch } from '@common/app/store'
import {
  clearFetchCache,
  putEvent as putEventAsync,
  removeEvent,
  updateEventInstance,
  updateEventLocal,
  updateSeries
} from '@common/features/Calendars/CalendarSlice'
import { eventDavPath } from '@common/features/Calendars/utils/calendarDavPath'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { calendarEventToJCal, detectRecurringEventChanges } from '../../utils'
import { assertThunkSuccess } from '@common/utils/assertThunkSuccess'
import {
  clearEventFormTempData,
  saveEventFormDataToTemp,
  showErrorNotification
} from '@common/utils/eventFormTempStorage'
import { extractEventBaseUuid } from '@common/utils/extractEventBaseUuid'
import {
  isMomentZone,
  resolveKnownTimezone,
  resolveTimezone,
  storedTimezone,
  wallClockOf,
  withStoredTimezones
} from '@common/utils/timezone'
import moment from 'moment'
import {
  deleteEvent,
  fetchRecurrentSeries,
  putEvent
} from '@common/features/Events/EventDao'
import {
  HandleUpdateErrorParams,
  RecurringUpdateContext,
  UpdateHelperContext
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
      URL: eventDavPath(targetCalendar, newUID),
      sequence: 1,
      recurrenceId: undefined
    }

    const jCal = calendarEventToJCal(finalNewEvent)
    await putEvent(finalNewEvent, jCal)
    dispatch(updateEventLocal({ calId: targetCalId, event: finalNewEvent }))
    createdUID = finalNewEvent.uid
    dispatch(clearFetchCache(targetCalId))

    removeSeriesFromUI(dispatch, calId, Object.keys(seriesSnap))
    hasRemovedSeries = true

    clearEventFormTempData('update')
    dispatch(eventSaved(finalNewEvent))
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
    updateEventInstance({
      cal: targetCalendar,
      event: { ...newEvent, recurrenceId }
    })
  )
  await assertThunkSuccess(result)
  clearEventFormTempData('update')
}

// The master, not the clicked occurrence, tells what the series was: the form
// of an "all events" edit starts from the master date
async function startsOnSeriesDay(
  values: RecurringUpdateContext['values'],
  seriesEvent: CalendarEvent
): Promise<boolean> {
  const seriesZone = resolveTimezone(seriesEvent.timezone || 'UTC')
  if (seriesEvent.allday || isMomentZone(seriesZone)) {
    const seriesTz = resolveTimezone(values.timezone || seriesZone)
    const seriesDay = moment.tz(seriesEvent.start, seriesTz)
    return moment.tz(values.start, seriesTz).isSame(seriesDay, 'day')
  }
  return startsOnCustomZoneDay(values, seriesEvent, seriesZone)
}

// The rule of a series in a custom zone is evaluated on the wall clock of its
// stored VTIMEZONE (#1941), while the form shows that zone in UTC: the days are
// compared in the zone the series is written in (#2033)
async function startsOnCustomZoneDay(
  values: RecurringUpdateContext['values'],
  seriesEvent: CalendarEvent,
  seriesZone: string
): Promise<boolean> {
  const formZone = resolveKnownTimezone(values.timezone || seriesZone)
  const newStart = moment.tz(values.start, formZone)
  const oldStart = moment(seriesEvent.start)
  if (newStart.isSame(oldStart)) return true

  const { vtimezones } = await fetchRecurrentSeries(seriesEvent)
  return withStoredTimezones(vtimezones, () => {
    // Without its VTIMEZONE, the series is written in UTC
    const zone = storedTimezone(seriesZone) ? seriesZone : 'UTC'
    const dayOf = (instant: moment.Moment): string =>
      wallClockOf(instant, zone).slice(0, 'YYYY-MM-DD'.length)
    return dayOf(newStart) === dayOf(oldStart)
  })
}

export async function handleUpdateRecurringSeries(
  params: RecurringUpdateContext
): Promise<void> {
  const { event, values, masterEvent } = params
  const seriesEvent = masterEvent || event
  const changes = detectRecurringEventChanges(
    seriesEvent,
    {
      repetition: values.repetition,
      timezone: values.timezone,
      allday: values.allday,
      start: values.start,
      end: values.end
    },
    masterEvent || null,
    // The zone the form starts from: a custom zone it shows in UTC is no change
    resolveKnownTimezone
  )

  // Overrides and EXDATEs designate occurrences: they survive as long as the
  // series keeps the same occurrences, possibly at another time of the day
  const staysOnSeriesDay =
    params.seriesDayChanged === undefined
      ? await startsOnSeriesDay(values, seriesEvent)
      : !params.seriesDayChanged
  const keepsOccurrences = staysOnSeriesDay && !changes.recurrenceChanged

  if (keepsOccurrences) {
    await handleUpdateRecurringSeriesKeepingOverrides({
      ...params,
      followTimeChange: changes.timeChanged
    })
  } else {
    await handleUpdateRecurringSeriesWithRuleChange({
      ...params,
      newEvent: { ...params.newEvent, exdates: [] }
    })
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
    await deleteEvent({
      URL: url
    } as CalendarEvent)
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
          alarms: newEvent.alarms,
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
      updateSeries({
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

// A single PUT of the whole calendar object: the master, plus the stored
// overrides and EXDATEs, moved along when the time of day changes
async function handleUpdateRecurringSeriesKeepingOverrides({
  dispatch,
  calId,
  newEvent,
  baseUID,
  targetCalendar,
  getSeriesInstances,
  recurrenceId,
  dropSourceOverride,
  followTimeChange
}: RecurringUpdateContext & { followTimeChange: boolean }): Promise<void> {
  if (!followTimeChange) {
    updateSeriesInstancesLocally(
      dispatch,
      calId,
      getSeriesInstances(),
      newEvent
    )
  }
  const masterForUpdate = {
    ...newEvent,
    uid: baseUID,
    recurrenceId: undefined
  }
  const result = await dispatch(
    updateSeries({
      cal: targetCalendar,
      event: masterForUpdate,
      removeOverrides: false,
      sourceRecurrenceId: dropSourceOverride ? recurrenceId : undefined,
      followTimeChange
    })
  )
  await assertThunkSuccess(result)
  dispatch(clearFetchCache(calId))
  clearEventFormTempData('update')
}
