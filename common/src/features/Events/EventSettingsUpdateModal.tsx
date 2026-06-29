import { useAppSelector } from '@common/app/hooks'
import { dialogPaddingStyles } from '@common/theme/dialogPaddingStyles'
import { ResponsiveDialog } from '@common/components/Dialog'
import { EventFormFieldPersonalSettings } from '@common/components/Event/EventFormFieldPersonalSettings'
import { useEventFormValues } from '@common/components/Event/hooks/useEventFormValues'
import { CalendarEvent } from '@common/types/EventsTypes'
import { Valarms } from '@common/types/Valarms'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import React, { useCallback, useMemo } from 'react'
import { useI18n } from 'twake-i18n'
import { EventActions } from './EventActions'
import { useEventOrganizer } from './useEventOrganizer'
import { useEventSettingsUpdateModal } from './useEventSettingsUpdateModal'
import { userAttendee } from '../User/models/attendee'

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
  const { open, typeOfAction } = props
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const calList = useAppSelector(state => state.calendars.list)
  const userOrganizer = useAppSelector(state => state.user.organiserData)

  const currentUserEmail = calList[props.calId]?.owner?.emails?.[0]
  const currentUser = currentUserEmail
    ? userAttendee.fromEmailField(currentUserEmail)
    : undefined

  const { isOrganizer } = useEventOrganizer({
    calendarid: props.calId,
    eventId: props.eventId,
    calList,
    userOrganizer
  })

  const {
    userPersonalCalendars,
    showMore,
    setShowMore,
    initialValues,
    handleClose,
    handleSubmit,
    tempContext
  } = useEventSettingsUpdateModal(props)

  const { formValues, setAlarms, setBusy, setEventClass, setCalendarid } =
    useEventFormValues({
      initialValues,
      isOpen: open,
      tempStorageKey: 'update',
      tempStorageContext: tempContext,
      onStartChange: () => {},
      onEndChange: () => {},
      onAllDayChange: () => {}
    })

  // Extract all alarms the current user is part of (personal + global)
  const editableAlarms = useMemo(() => {
    if (!currentUser) return []
    return formValues.alarms.getAllAlarmsForAttendee(currentUser)
  }, [formValues.alarms, currentUser])

  const handleSave = useCallback(async () => {
    // Get the original event to preserve other attendees' alarms
    const originalEvent =
      calList[props.calId]?.events?.[props.eventId] || props.event
    const originalAlarms = originalEvent?.alarms

    // Merge form alarms back with original, handling global alarm unsubscription
    const formAlarms = Valarms.fromList(editableAlarms)
    const mergedAlarms =
      originalAlarms && currentUser
        ? originalAlarms.mergeForPersonalSettingsUpdate(formAlarms, currentUser)
        : formAlarms

    const valuesWithMergedAlarms = {
      ...formValues,
      alarms: mergedAlarms
    }

    await handleSubmit(valuesWithMergedAlarms)
  }, [
    handleSubmit,
    formValues,
    editableAlarms,
    calList,
    props.calId,
    props.eventId,
    props.event,
    currentUser
  ])

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
      <EventFormFieldPersonalSettings
        v={{
          ...formValues,
          // Show all alarms the user is part of (personal + global)
          alarms: Valarms.fromList(editableAlarms)
        }}
        t={t}
        typeOfAction={typeOfAction}
        setCalendarid={setCalendarid}
        userPersonalCalendars={userPersonalCalendars}
        showMore={showMore}
        setAlarms={setAlarms}
        setBusy={setBusy}
        setEventClass={setEventClass}
        isOrganizer={isOrganizer}
        user={currentUser}
      />
    </ResponsiveDialog>
  )
}

const EventSettingsUpdateModal: React.FC<
  EventSettingsUpdateModalProps
> = props => {
  const { eventId, calId, eventData } = props
  const cachedEvent = useAppSelector(
    state => state.calendars.list[calId]?.events?.[eventId]
  )
  const event = eventData || cachedEvent

  if (!event) return null

  return <EventSettingsUpdateModalInternal {...props} event={event} />
}

export default EventSettingsUpdateModal
