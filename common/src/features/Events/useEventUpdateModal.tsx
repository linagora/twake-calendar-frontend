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
import { Valarms } from '@common/types/Valarms'
import { userOrganiser } from '@common/features/User/userDataTypes'
import { EventUpdateModalProps } from './EventUpdateModal'
import { useMasterEvent } from './hooks/useMasterEvent'
import { useSubmitUpdateEvent } from './hooks/useSubmitUpdateEvent'

export function useEventUpdateModal(
  props: EventUpdateModalProps & { event: CalendarEvent }
): {
  userPersonalCalendars: Calendar[]
  showMore: boolean
  setShowMore: React.Dispatch<React.SetStateAction<boolean>>
  formRef: React.RefObject<EventFormHandle>
  effectiveEvent: CalendarEvent | undefined | null
  hasOverrides: boolean
  initialValues: ReturnType<typeof useBuildInitialValues>
  handleClose: () => void
  handleSubmit: (
    values: EventFormValues,
    organizer?: userOrganiser
  ) => Promise<void>
  handleExpandToggle: () => void
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

  const { masterEvent, effectiveEvent, hasOverrides } = useMasterEvent(
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

  const { handleSubmit: submitUpdate } = useSubmitUpdateEvent({
    event,
    calId,
    eventId,
    typeOfAction,
    masterEvent,
    showMore,
    onClose: handleClose
  })

  const handleSubmit = useCallback(
    async (
      values: EventFormValues,
      organizer?: userOrganiser
    ): Promise<void> => {
      // Get the original event to preserve personal alarms
      const originalEvent = effectiveEvent || event
      const originalAlarms = originalEvent?.alarms

      const isMultiUser = (values.attendees?.length ?? 0) > 1

      let mergedAlarms: Valarms
      if (isMultiUser && originalAlarms) {
        // Multi-user event: edit global alarms only, preserve personal alarms
        // from other users that aren't shown in the form
        const globalAlarmsFromForm = Valarms.fromList(
          values.alarms.getGlobalAlarms()
        )
        mergedAlarms =
          globalAlarmsFromForm.withPersonalAlarmsFrom(originalAlarms)
      } else {
        // Single-user event: use form alarms directly
        mergedAlarms = values.alarms
      }

      const valuesWithMergedAlarms = {
        ...values,
        alarms: mergedAlarms
      }

      await submitUpdate(valuesWithMergedAlarms, organizer)
    },
    [effectiveEvent, event, submitUpdate]
  )

  const tempContext: EventFormContext = { eventId, calId, typeOfAction }

  const handleExpandToggle = (): void => setShowMore(s => !s)

  const handleSave = useCallback(async () => {
    await formRef.current?.submit()
  }, [formRef])

  return {
    userPersonalCalendars,
    showMore,
    setShowMore,
    formRef,
    effectiveEvent,
    hasOverrides,
    initialValues,
    handleClose,
    handleSubmit,
    handleExpandToggle,
    handleSave,
    tempContext
  }
}
