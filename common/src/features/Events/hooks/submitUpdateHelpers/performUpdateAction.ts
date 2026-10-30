import { eventSaved } from '../../eventSaveFeedbackSlice'
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
    } else if (!recurrenceId) {
      await handleUpdateNonRecurring(params)
    } else if (typeOfAction === 'solo') {
      await handleUpdateRecurringSolo({ ...params, recurrenceId })
    } else if (typeOfAction === 'all') {
      await handleUpdateRecurringSeries(params)
    } else {
      return
    }
    dispatch(eventSaved(newEvent))
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

// A single occurrence keeps its own date, only a series is realigned
function alignSeriesStart(
  params: HandleUpdateSubmitParams
): HandleUpdateSubmitParams {
  if (params.typeOfAction === 'solo') return params
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
