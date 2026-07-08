import { useAppSelector } from '@common/app/hooks'
import { dialogPaddingStyles } from '@common/theme/dialogPaddingStyles'
import { ResponsiveDialog } from '@common/components/Dialog'
import EventFormFields from '@common/components/Event/EventFormFields'
import { CalendarEvent } from '@common/types/EventsTypes'
import { Valarms } from '@common/types/Valarms'
import { userAttendee } from '@common/features/User/models/attendee'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import React, { useMemo } from 'react'
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
  const user = useAppSelector(state => state.user)

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

  // Determine if this is a single-user event (only the current user as attendee/organizer)
  const isSingleUserEvent = useMemo(() => {
    const attendees = initialValues.attendees || []
    const currentUserEmail = user.userData?.email?.toLowerCase()
    if (!currentUserEmail) return false
    // Single user if only current user is in attendees (or no attendees at all)
    if (attendees.length === 0) return true
    if (attendees.length > 1) return false
    // Check if the single attendee is the current user
    const attendeeEmail = attendees[0]?.cal_address
      ?.toLowerCase()
      .replace('mailto:', '')
    return attendeeEmail === currentUserEmail
  }, [initialValues.attendees, user.userData?.email])

  // Filter initial values: for single-user events show global + personal alarms,
  // for multi-user events show only global alarms
  const editableInitialValues = useMemo(() => {
    if (!initialValues.alarms) return initialValues
    if (isSingleUserEvent) {
      const currentUserAttendee = user.userData?.email
        ? new userAttendee({
            cal_address: `mailto:${user.userData.email}`,
            cn: user.userData.name || user.userData.email
          })
        : undefined
      return {
        ...initialValues,
        alarms: Valarms.fromList(
          initialValues.alarms.getEditableAlarms(currentUserAttendee)
        )
      }
    }
    // Multi-user event: show only global alarms
    return {
      ...initialValues,
      alarms: Valarms.fromList(initialValues.alarms.getGlobalAlarms())
    }
  }, [initialValues, user.userData, isSingleUserEvent])

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
