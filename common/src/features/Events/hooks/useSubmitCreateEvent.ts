import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent } from '@common/types/EventsTypes'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'
import { handleCreateEvent } from './submitCreateHelpers/createAction'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { useI18n } from 'twake-i18n'

export interface UseSubmitCreateEventProps {
  showMore: boolean
  onClose: (refresh?: boolean) => void
  /** Called with the event once it is saved */
  onCreated?: (event: CalendarEvent) => void
  userPersonalCalendars: Calendar[]
}

export function useSubmitCreateEvent({
  showMore,
  onClose,
  onCreated,
  userPersonalCalendars
}: UseSubmitCreateEventProps): {
  /** Resolves true once the server saved the event, false otherwise */
  handleSubmit: (
    values: EventFormValues,
    organizer?: userOrganiser
  ) => Promise<boolean>
} {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const calList = useAppSelector(state => state.calendars.list)

  const handleSubmit = useCallback(
    async (
      values: EventFormValues,
      organizer?: userOrganiser
    ): Promise<boolean> => {
      const targetCalendar: Calendar | undefined =
        calList[values.calendarid] ||
        userPersonalCalendars[0] ||
        Object.values(calList)[0]

      if (!targetCalendar?.id) {
        console.error('No target calendar available to save event')
        return false
      }

      return handleCreateEvent({
        dispatch,
        values,
        targetCalendar,
        showMore,
        organizer,
        onClose,
        onCreated,
        t
      })
    },
    [showMore, onClose, onCreated, userPersonalCalendars, dispatch, calList, t]
  )

  return { handleSubmit }
}
