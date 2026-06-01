import { AppDispatch } from '@common/app/store'
import { formatLocalDateTime } from '@common/components/Event/utils/dateTimeFormatters'
import {
  clearFetchCache,
  putEvent as putEventAsync,
  removeEvent,
  updateEventInstance,
  updateEventLocal,
  updateSeries
} from '@common/features/Calendars/CalendarSlice'
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
import { resolveTimezone } from '@common/utils/timezone'
import moment from 'moment'
import { deleteEvent, putEvent } from '@common/features/Events/EventDao'
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
      URL: `/calendars/${targetCalId}/${newUID}.ics`,
      sequence: 1,
      recurrenceId: undefined
    }

    const jCal = calendarEventToJCal(
      finalNewEvent,
      targetCalendar.owner?.emails?.[0]
    )
    await putEvent(finalNewEvent, jCal)
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
    updateEventInstance({
      cal: targetCalendar,
      event: { ...newEvent, recurrenceId }
    })
  )
  await assertThunkSuccess(result)
  clearEventFormTempData('update')
}

function shiftInstance(params: {
  inst: CalendarEvent
  masterTz: string
  seriesDeltaMs: number
  newEvent: CalendarEvent
}): CalendarEvent {
  const { inst, masterTz, seriesDeltaMs, newEvent } = params
  return {
    ...inst,
    title: newEvent.title,
    description: newEvent.description,
    location: newEvent.location,
    class: newEvent.class,
    transp: newEvent.transp,
    attendee: newEvent.attendee,
    alarm: newEvent.alarm,
    x_openpass_videoconference: newEvent.x_openpass_videoconference,
    recurrenceId: inst.recurrenceId
      ? formatLocalDateTime(
          moment
            .tz(inst.recurrenceId, masterTz)
            .add(seriesDeltaMs, 'ms')
            .toDate(),
          masterTz
        )
      : undefined,
    start: formatLocalDateTime(
      moment.tz(inst.start, masterTz).add(seriesDeltaMs, 'ms').toDate(),
      masterTz
    ),
    end: inst.end
      ? formatLocalDateTime(
          moment.tz(inst.end, masterTz).add(seriesDeltaMs, 'ms').toDate(),
          masterTz
        )
      : undefined
  }
}

async function handleUpdateSeriesTimeChangeOnly(params: {
  updateContext: RecurringUpdateContext
  seriesDeltaMs: number
  masterTz: string
}): Promise<void> {
  const { updateContext, seriesDeltaMs, masterTz } = params
  const { event, values, dispatch, calId, targetCalendar, getSeriesInstances } =
    updateContext

  let updatedExdates = event.exdates
  if (event.exdates) {
    updatedExdates = event.exdates.map(exdate => {
      const mExdate = moment.tz(exdate, masterTz)
      return formatLocalDateTime(
        mExdate.add(seriesDeltaMs, 'ms').toDate(),
        masterTz
      )
    })
  }

  const shiftedMasterEvent = {
    ...updateContext.newEvent,
    start: values.start,
    end: values.end,
    uid: updateContext.baseUID,
    recurrenceId: undefined,
    exdates: updatedExdates
  }

  const seriesSnap = getSeriesInstances()
  const shiftedInstances = Object.values(seriesSnap).map(inst =>
    shiftInstance({
      inst,
      masterTz,
      seriesDeltaMs,
      newEvent: updateContext.newEvent
    })
  )

  const result = await dispatch(
    updateSeries({
      cal: targetCalendar,
      event: shiftedMasterEvent,
      removeOverrides: false,
      sourceRecurrenceId: updateContext.recurrenceId
    })
  )
  await assertThunkSuccess(result)

  const results = await Promise.allSettled(
    shiftedInstances.map(inst =>
      dispatch(updateEventInstance({ cal: targetCalendar, event: inst }))
    )
  )
  const failures = results.filter(r => r.status === 'rejected')
  if (failures.length > 0) {
    console.error(`${failures.length} instance update(s) failed`)
  }

  dispatch(clearFetchCache(calId))
  clearEventFormTempData('update')
}

async function handleUpdateSeriesRuleOrDateChange(params: {
  updateContext: RecurringUpdateContext
  isSameDay: boolean
  changes: {
    timeChanged: boolean
    timezoneChanged: boolean
    repetitionRulesChanged: boolean
  }
}): Promise<void> {
  const { updateContext, isSameDay, changes } = params
  const shouldClearExdates =
    !isSameDay || changes.repetitionRulesChanged || changes.timezoneChanged

  const modifiedNewEvent = {
    ...updateContext.newEvent,
    exdates: shouldClearExdates ? [] : updateContext.newEvent.exdates
  }

  if (changes.repetitionRulesChanged || !isSameDay) {
    await handleUpdateRecurringSeriesWithRuleChange({
      ...updateContext,
      newEvent: modifiedNewEvent
    })
  } else {
    await handleUpdateRecurringSeriesMetadataOnly({
      ...updateContext,
      newEvent: modifiedNewEvent
    })
  }
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

  const isSameDay = moment(values.start).isSame(moment(event.start), 'day')
  const isTimeChangeOnly =
    isSameDay && !changes.repetitionRulesChanged && !changes.timezoneChanged

  if (isTimeChangeOnly) {
    const masterTz =
      event.timezone || resolveTimezone(masterEvent?.timezone || '')
    const seriesDeltaMs =
      moment(values.start).valueOf() - moment(event.start).valueOf()

    await handleUpdateSeriesTimeChangeOnly({
      updateContext: params,
      seriesDeltaMs,
      masterTz
    })
  } else {
    await handleUpdateSeriesRuleOrDateChange({
      updateContext: params,
      isSameDay,
      changes
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

async function handleUpdateRecurringSeriesMetadataOnly({
  dispatch,
  calId,
  newEvent,
  baseUID,
  targetCalendar,
  getSeriesInstances,
  recurrenceId
}: RecurringUpdateContext): Promise<void> {
  updateSeriesInstancesLocally(dispatch, calId, getSeriesInstances(), newEvent)
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
      sourceRecurrenceId: recurrenceId
    })
  )
  await assertThunkSuccess(result)
  dispatch(clearFetchCache(calId))
  clearEventFormTempData('update')
}
