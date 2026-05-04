import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAppSelector } from '@/app/hooks'
import { ResponsiveDialog } from '@/components/Dialog'
import EventFormFields from '@/components/Event/EventFormFields'
import type { EventFormHandle } from '@/components/Event/EventFormFields.types'
import {
  clearEventFormTempData,
  EventFormContext
} from '@/utils/eventFormTempStorage'
import { useI18n } from 'twake-i18n'
import { CalendarEvent } from './EventsTypes'
import { useScreenSizeDetection } from '@/useScreenSizeDetection'
import { EventActions } from './EventActions'
import { useBuildInitialValues } from '@/components/Event/hooks/useBuildInitialValues'
import { useSubmitUpdateEvent } from '@/features/Events/hooks/useSubmitUpdateEvent'
import { useMasterEvent } from '@/features/Events/hooks/useMasterEvent'
import { useUserPersonalCalendars } from '@/features/Calendars/hooks/useUserPersonalCalendars'
import type { SxProps } from '@mui/material/styles'

const dialogPaddingStyles = (isMobile: boolean): SxProps => ({
  '& .MuiDialogActions-root': {
    paddingLeft: isMobile ? 2 : 4,
    paddingRight: isMobile ? 2 : 4
  }
})

interface EventUpdateModalProps {
  eventId: string
  calId: string
  open: boolean
  onClose: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void
  onCloseAll?: () => void
  eventData?: CalendarEvent | null
  typeOfAction?: 'solo' | 'all'
}

const EventUpdateModalInternal: React.FC<
  EventUpdateModalProps & { event: CalendarEvent }
> = ({ eventId, calId, open, onClose, onCloseAll, event, typeOfAction }) => {
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()
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

  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={t('event.updateEvent')}
      isExpanded={showMore}
      onExpandToggle={() => setShowMore(s => !s)}
      actions={
        <EventActions
          showExpandedBtn={!showMore}
          isEdit
          onClose={handleClose}
          onSave={async () => {
            await formRef.current?.submit()
          }}
          onExpanded={() => setShowMore(s => !s)}
        />
      }
      sx={dialogPaddingStyles(isMobile)}
    >
      <EventFormFields
        key={effectiveEvent?.uid || 'no-event'}
        ref={formRef}
        initialValues={initialValues}
        showMore={showMore}
        isOpen={open}
        typeOfAction={typeOfAction}
        eventId={event.uid}
        userPersonalCalendars={userPersonalCalendars}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        tempStorageKey="update"
        tempStorageContext={tempContext}
      />
    </ResponsiveDialog>
  )
}

const EventUpdateModal: React.FC<EventUpdateModalProps> = props => {
  const { eventId, calId, eventData } = props
  const cachedEvent = useAppSelector(
    state => state.calendars.list[calId]?.events[eventId]
  )
  const event = eventData || cachedEvent

  if (!event) return null

  return <EventUpdateModalInternal {...props} event={event} />
}

export default EventUpdateModal
