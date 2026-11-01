import {
  handleUpdateError,
  handleUpdateRecurringSolo,
  handleUpdateRecurringSeries,
  handleUpdateNonRecurring,
  handleConvertRecurringToSingle
} from './updateActions'
import { prepareUpdateData } from './utils'
import { PerformUpdateActionParams, HandleUpdateSubmitParams } from './types'
import { alignStartToWeekdays } from '@common/features/Events/utils/alignStartToWeekdays'
import { moveEventBetweenCalendars } from '@common/features/Events/updateEventHelpers/moveEventBetweenCalendars'
import { resolveEventISORange } from '@common/components/Event/utils/dateRangeUtils'

export async function performUpdateAction(
  params: PerformUpdateActionParams
): Promise<void> {
  const {
    recurrenceId,
    typeOfAction,
    values,
    tempContext,
    calId,
    eventId,
    newCalId,
    dispatch,
    calList,
    newEvent
  } = params

  try {
    if (newCalId !== calId) {
      await moveEventBetweenCalendars({
        dispatch,
        calList,
        newEvent,
        oldCalId: calId,
        newCalId
      })
      return
    }

    if (!recurrenceId) {
      await handleUpdateNonRecurring(params)
      return
    }

    if (typeOfAction === 'solo') {
      await handleUpdateRecurringSolo({ ...params, recurrenceId })
      return
    }

    if (typeOfAction === 'all') {
      await handleUpdateRecurringSeries(params)
      return
    }
  } catch (error) {
    handleUpdateError({
      error,
      values,
      tempContext,
      eventId,
      calId,
      typeOfAction,
      defaultMessage: 'Failed to update event. Please try again.'
    })
  }
}

function sameWeekdays(
  left?: string[] | null,
  right?: string[] | null
): boolean {
  const leftDays = [...(left ?? [])].sort()
  const rightDays = [...(right ?? [])].sort()
  return (
    leftDays.length === rightDays.length &&
    leftDays.every((day, index) => day === rightDays[index])
  )
}

// A stored series may start outside its BYDAY days (other clients write it
// so): moving its start would drop its first occurrence and reset every
// answer, so only a start or weekdays chosen in the form are realigned
function keepsStoredWeeklySeries(params: HandleUpdateSubmitParams): boolean {
  const { values, event, masterEvent, typeOfAction, showMore } = params
  const stored = typeOfAction === 'all' && masterEvent ? masterEvent : event
  if (stored.repetition?.freq !== values.repetition?.freq) return false
  if (!sameWeekdays(stored.repetition?.byday, values.repetition?.byday))
    return false

  const { startISO } = resolveEventISORange({
    start: values.start,
    end: values.end,
    allday: values.allday,
    timezone: values.timezone,
    showMore,
    hasEndDateChanged: values.hasEndDateChanged
  })
  return new Date(stored.start).getTime() === new Date(startISO).getTime()
}

// A single occurrence keeps its own date, only a series is realigned
function alignSeriesStart(
  params: HandleUpdateSubmitParams
): HandleUpdateSubmitParams {
  if (params.typeOfAction === 'solo') return params
  if (keepsStoredWeeklySeries(params)) return params
  return { ...params, values: alignStartToWeekdays(params.values) }
}

export async function handleUpdateSubmit(
  submitParams: HandleUpdateSubmitParams
): Promise<void> {
  const params = alignSeriesStart(submitParams)
  const updateData = prepareUpdateData(params)

  if (!updateData) return

  const { isConvertingRecurringToSingle, ...updateActionParams } = updateData

  if (isConvertingRecurringToSingle) {
    params.onClose()
    return handleConvertRecurringToSingle({
      ...params,
      ...updateActionParams
    })
  }

  // ---------- Normal update path ----------
  params.onClose()
  await performUpdateAction({
    ...params,
    ...updateActionParams
  })
}
