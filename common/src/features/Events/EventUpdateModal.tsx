import { useAppSelector } from '@common/app/hooks'
import { dialogPaddingStyles } from '@common/theme/dialogPaddingStyles'
import { ConfirmDiscardChangesDialog } from '@common/components/Dialog/ConfirmDiscardChangesDialog'
import { ResponsiveDialog } from '@common/components/Dialog'
import { Alert } from '@linagora/twake-mui'
import EventFormFields from '@common/components/Event/EventFormFields'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import React, { useCallback, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { EventActions } from './EventActions'
import { useEventUpdateModal } from './useEventUpdateModal'
import { useEditableInitialValues } from './hooks/useEditableInitialValues'
import { useUnsavedChangesGuard } from './hooks/useUnsavedChangesGuard'
import { CALENDAR_VIEWS } from '@common/components/Calendar/utils/constants'

export interface EventUpdateModalProps {
  eventId: string
  calId: string
  open: boolean
  onClose: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void
  onCloseAll?: () => void
  eventData?: CalendarEvent | null
  typeOfAction?: 'solo' | 'all'
  anchorEl?: HTMLElement | null
  currentView?: string
}

const EventUpdateModalInternal: React.FC<
  EventUpdateModalProps & { event: CalendarEvent }
> = props => {
  const { open, event, typeOfAction, currentView } = props
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const {
    userPersonalCalendars,
    showMore,
    setShowMore,
    formRef,
    effectiveEvent,
    hasOverrides,
    initialValues,
    handleClose: performClose,
    handleSubmit,
    handleExpandToggle,
    handleSave,
    tempContext
  } = useEventUpdateModal(props)

  const editableInitialValues = useEditableInitialValues(initialValues)

  const [isFormDirty, setIsFormDirty] = useState(false)
  const guard = useUnsavedChangesGuard(open && isFormDirty)
  const handleClose = useCallback(() => {
    guard.requestClose(() => {
      setIsFormDirty(false)
      performClose()
    })
  }, [guard, performClose])

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
    <>
      <ResponsiveDialog
        open={open}
        onClose={handleClose}
        title={t('event.updateEvent')}
        isExpanded={showMore}
        onExpandToggle={handleExpandToggle}
        draggable={!showMore}
        anchorEl={props.anchorEl}
        dynamicPositioning={currentView !== CALENDAR_VIEWS.listWeek}
        actions={actions}
        sx={dialogPaddingStyles(isMobile)}
        expandText={t('tooltip.moreEventOptions')}
      >
        {typeOfAction === 'all' && hasOverrides && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            data-testid="series-overrides-warning"
          >
            {t('event.form.seriesOverridesWarning')}
          </Alert>
        )}
        <EventFormFields
          key={effectiveEvent?.uid || 'no-event'}
          ref={formRef}
          initialValues={editableInitialValues}
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
          onDirtyChange={setIsFormDirty}
        />
      </ResponsiveDialog>
      <ConfirmDiscardChangesDialog
        open={guard.showConfirm}
        onCancel={guard.cancelClose}
        onConfirm={() => {
          setIsFormDirty(false)
          performClose()
          guard.confirmClose()
        }}
      />
    </>
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
