import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { Calendar } from '@common/types/CalendarTypes'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { handleCreateEvent } from './submitCreateHelpers/createAction'
import { userOrganiser } from '@common/features/User/userDataTypes'

export interface UseSubmitCreateEventProps {
  showMore: boolean
  onClose: (refresh?: boolean) => void
  userPersonalCalendars: Calendar[]
}

export function useSubmitCreateEvent({
  showMore,
  onClose,
  userPersonalCalendars
}: UseSubmitCreateEventProps): {
  handleSubmit: (
    values: EventFormValues,
    organizer?: userOrganiser
  ) => Promise<void>
} {
  const dispatch = useAppDispatch()
  const calList = useAppSelector(state => state.calendars.list)

  const handleSubmit = useCallback(
    async (
      values: EventFormValues,
      organizer?: userOrganiser
    ): Promise<void> => {
      const targetCalendar: Calendar | undefined =
        calList[values.calendarid] ||
        userPersonalCalendars[0] ||
        (Object.values(calList)[0] as Calendar | undefined)

      if (!targetCalendar?.id) {
        console.error('No target calendar available to save event')
        return
      }

      await handleCreateEvent({
        dispatch,
        values,
        targetCalendar,
        showMore,
        organizer,
        onClose
      })
    },
    [showMore, onClose, userPersonalCalendars, dispatch, calList]
  )

  return { handleSubmit }
}
