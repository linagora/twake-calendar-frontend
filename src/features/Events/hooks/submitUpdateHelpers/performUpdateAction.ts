import {
  handleUpdateError,
  handleUpdateRecurringSolo,
  handleUpdateRecurringSeries,
  handleUpdateNonRecurring,
  handleConvertRecurringToSingle
} from './updateActions'
import { prepareUpdateData } from './utils'
import { PerformUpdateActionParams, HandleUpdateSubmitParams } from './types'
import { moveEventBetweenCalendars } from '../../updateEventHelpers/moveEventBetweenCalendars'

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

export async function handleUpdateSubmit(
  params: HandleUpdateSubmitParams
): Promise<void> {
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
