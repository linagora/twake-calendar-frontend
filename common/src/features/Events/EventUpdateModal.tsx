import { useAppSelector } from '@common/app/hooks'
import { dialogPaddingStyles } from '@common/theme/dialogPaddingStyles'
import { ResponsiveDialog } from '@common/components/Dialog'
import EventFormFields from '@common/components/Event/EventFormFields'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import React from 'react'
import { useI18n } from 'twake-i18n'
import { EventActions } from './EventActions'
import { useEventUpdateModal } from './useEventUpdateModal'

export interface EventUpdateModalProps {
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
    handleExpandToggle,
    handleSave,
    tempContext
  } = useEventUpdateModal(props)

  const actions = (
    <EventActions
      showExpandedBtn={!showMore}
      isEdit
      onClose={handleClose}
      onSave={handleSave}
      onExpanded={() => setShowMore(s => !s)}
    />
  )
  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={t('event.updateEvent')}
      isExpanded={showMore}
      onExpandToggle={handleExpandToggle}
      actions={actions}
      sx={dialogPaddingStyles(isMobile)}
      expandText={t('tooltip.moreEventOptions')}
    >
      <EventFormFields
        key={effectiveEvent?.uid || 'no-event'}
        ref={formRef}
        initialValues={initialValues}
        showMore={showMore}
        isOpen={open}
        isSpecific={false}
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
