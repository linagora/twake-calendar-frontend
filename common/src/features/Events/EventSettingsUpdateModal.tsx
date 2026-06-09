import { useAppSelector } from '@common/app/hooks'
import { dialogPaddingStyles } from '@common/CalendarTheme/dialogPaddingStyles'
import { ResponsiveDialog } from '@common/components/Dialog'
import { EventFormFieldPersonalSettings } from '@common/components/Event/EventFormFieldPersonalSettings'
import { useEventFormValues } from '@common/components/Event/hooks/useEventFormValues'
import { CalendarEvent } from '@common/types/EventsTypes'
import { useScreenSizeDetection } from '@common/useScreenSizeDetection'
import React, { useCallback } from 'react'
import { useI18n } from 'twake-i18n'
import { EventActions } from './EventActions'
import { useEventOrganizer } from './useEventOrganizer'
import { useEventSettingsUpdateModal } from './useEventSettingsUpdateModal'

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

  const { formValues, setAlarm, setBusy, setEventClass, setCalendarid } =
    useEventFormValues({
      initialValues,
      isOpen: open,
      tempStorageKey: 'update',
      tempStorageContext: tempContext,
      onStartChange: () => {},
      onEndChange: () => {},
      onAllDayChange: () => {}
    })

  const handleSave = useCallback(async () => {
    await handleSubmit(formValues)
  }, [handleSubmit, formValues])

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
        v={formValues}
        t={t}
        typeOfAction={typeOfAction}
        setCalendarid={setCalendarid}
        userPersonalCalendars={userPersonalCalendars}
        showMore={showMore}
        setAlarm={setAlarm}
        setBusy={setBusy}
        setEventClass={setEventClass}
        isOrganizer={isOrganizer}
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
