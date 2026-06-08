import { useAppSelector } from '@common/app/hooks'
import type {
  EventFormHandle,
  EventFormValues
} from '@common/components/Event/EventFormFields.types'
import { useBuildInitialValues } from '@common/components/Event/hooks/useBuildInitialValues'
import {
  clearEventFormTempData,
  EventFormContext
} from '@common/utils/eventFormTempStorage'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Calendar } from '@common/types/CalendarTypes'
import { useUserPersonalCalendars } from '@common/features/Calendars/hooks/useUserPersonalCalendars'
import { CalendarEvent } from '@common/types/EventsTypes'
import { EventSettingsUpdateModalProps } from './EventSettingsUpdateModal'
import { useMasterEvent } from './hooks/useMasterEvent'
import { useSubmitUpdateEvent } from './hooks/useSubmitUpdateEvent'

export function useEventSettingsUpdateModal(
  props: EventSettingsUpdateModalProps & { event: CalendarEvent }
): {
  userPersonalCalendars: Calendar[]
  showMore: boolean
  setShowMore: React.Dispatch<React.SetStateAction<boolean>>
  formRef: React.RefObject<EventFormHandle>
  effectiveEvent: CalendarEvent | undefined | null
  initialValues: ReturnType<typeof useBuildInitialValues>
  handleClose: () => void
  handleSubmit: (values: EventFormValues) => Promise<void>
  handleSave: () => Promise<void>
  tempContext: EventFormContext
} {
  const { eventId, calId, open, onClose, onCloseAll, event, typeOfAction } =
    props

  const calList = useAppSelector(state => state.calendars.list)
  const user = useAppSelector(state => state.user)

  const userPersonalCalendars = useUserPersonalCalendars(
    calList,
    user.userData?.openpaasId
  )

  const [showMore, setShowMore] = useState(false)
  const formRef = useRef<EventFormHandle>(null)

  const { masterEvent, effectiveEvent } = useMasterEvent(
    event,
    open,
    typeOfAction
  )

  const initialValues = useBuildInitialValues({
    event: effectiveEvent || null,
    calId,
    selectedRange: null
  })

  useEffect(() => {
    const resetShowMore = (): void => {
      if (!open) setShowMore(false)
    }
    resetShowMore()
  }, [open])

  const handleClose = useCallback((): void => {
    clearEventFormTempData('update')
    if (onCloseAll) onCloseAll()
    else onClose({}, 'backdropClick')
    setShowMore(false)
  }, [onClose, onCloseAll])

  const { handleSubmit } = useSubmitUpdateEvent({
    event,
    calId,
    eventId,
    typeOfAction,
    masterEvent,
    showMore,
    onClose: handleClose
  })

  const tempContext: EventFormContext = { eventId, calId, typeOfAction }

  const handleSave = useCallback(async () => {
    await formRef.current?.submit()
  }, [])

  return {
    userPersonalCalendars,
    showMore,
    setShowMore,
    formRef,
    effectiveEvent,
    initialValues,
    handleClose,
    handleSubmit,
    handleSave,
    tempContext
  }
}
