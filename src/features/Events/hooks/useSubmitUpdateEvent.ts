import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { CalendarEvent } from '@/features/Events/EventsTypes'
import { EventFormValues } from '@/components/Event/EventFormFields.types'
import { handleUpdateSubmit } from './submitUpdateHelpers/performUpdateAction'

export interface UseSubmitUpdateEventProps {
  event: CalendarEvent
  calId: string
  eventId: string
  typeOfAction?: 'solo' | 'all'
  masterEvent?: CalendarEvent | null
  showMore: boolean
  onClose: (refresh?: boolean) => void
}

export const useSubmitUpdateEvent = ({
  event,
  calId,
  eventId,
  typeOfAction,
  masterEvent,
  showMore,
  onClose
}: UseSubmitUpdateEventProps): {
  handleSubmit: (values: EventFormValues) => Promise<void>
} => {
  const dispatch = useAppDispatch()
  const calList = useAppSelector(state => state.calendars.list)

  const handleSubmit = useCallback(
    async (values: EventFormValues): Promise<void> => {
      await handleUpdateSubmit({
        event,
        values,
        calList,
        showMore,
        calId,
        eventId,
        typeOfAction,
        onClose,
        dispatch,
        masterEvent
      })
    },
    [
      event,
      calId,
      eventId,
      typeOfAction,
      masterEvent,
      showMore,
      onClose,
      dispatch,
      calList
    ]
  )

  return { handleSubmit }
}
