import { useAppSelector } from '@common/app/hooks'
import { ResponsiveDialog } from '@common/components/Dialog'
import EventFormFields from '@common/components/Event/EventFormFields'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import type { SxProps } from '@mui/material/styles'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { EventActions } from './EventActions'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useEventSettingsUpdateModal } from './useEventSettingsUpdateModal'

const dialogPaddingStyles = (isMobile: boolean): SxProps => ({
  '& .MuiDialogActions-root': {
    paddingLeft: isMobile ? 2 : 4,
    paddingRight: isMobile ? 2 : 4
  }
})

export interface EventSettingsUpdateModalProps {
  eventId: string
  calId: string
  open: boolean
  onClose: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void
  onCloseAll?: () => void
  eventData?: CalendarEvent | null
  typeOfAction?: 'solo' | 'all'
}

const EventSettingsUpdateModalInternal: React.FC<
  EventSettingsUpdateModalProps & { event: CalendarEvent }
> = props => {
  const { open, event, typeOfAction } = props
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const {
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
  } = useEventSettingsUpdateModal(props)

  const actions = (
    <EventActions
      showExpandedBtn={false}
      isEdit
      onClose={handleClose}
      onSave={handleSave}
      onExpanded={() => setShowMore((s: boolean) => !s)}
    />
  )
  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={t('eventPreview.editEventSpecificSettings')}
      actions={actions}
      sx={dialogPaddingStyles(isMobile)}
    >
      <EventFormFields
        key={effectiveEvent?.uid || 'no-event'}
        ref={formRef}
        initialValues={initialValues}
        showMore={showMore}
        isOpen={open}
        isSpecific={true}
        typeOfAction={typeOfAction}
        eventId={event.uid}
        event={event}
        userPersonalCalendars={userPersonalCalendars}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        tempStorageKey="update"
        tempStorageContext={tempContext}
      />
    </ResponsiveDialog>
  )
}

const EventSettingsUpdateModal: React.FC<
  EventSettingsUpdateModalProps
> = props => {
  const { eventId, calId, eventData } = props
  const cachedEvent = useAppSelector(
    state => state.calendars.list[calId]?.events[eventId]
  )
  const event = eventData || cachedEvent

  if (!event) return null

  return <EventSettingsUpdateModalInternal {...props} event={event} />
}

export default EventSettingsUpdateModal
