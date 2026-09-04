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
import moment from 'moment'
import { formatLocalDateTime } from '@common/components/Event/utils/dateTimeFormatters'
import { EventFormValues } from '@common/components/Event/EventFormFields.types'

export interface EventSettingsUpdateModalProps {
  eventId: string
  calId: string
  open: boolean
  onClose: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void
  onCloseAll?: () => void
  eventData?: CalendarEvent | null
  typeOfAction?: 'solo' | 'all'
  anchorEl?: HTMLElement | null
}

function getCurrentUser(
  calList: Record<string, { owner?: { emails?: string[] } }>,
  calId: string
): userAttendee | undefined {
  const email = calList[calId]?.owner?.emails?.[0]
  return email ? userAttendee.fromEmailField(email) : undefined
}

function getOriginalEvent(params: {
  typeOfAction?: 'solo' | 'all'
  masterEvent: CalendarEvent | null
  cachedEvent?: CalendarEvent
  fallbackEvent: CalendarEvent
}): CalendarEvent {
  if (params.typeOfAction === 'all' && params.masterEvent) {
    return params.masterEvent
  }
  return params.cachedEvent || params.fallbackEvent
}

function mergeUserAlarms(
  originalAlarms: Valarms | undefined,
  editableAlarms: ReturnType<Valarms['getAllAlarmsForAttendee']>,
  currentUser?: userAttendee
): Valarms {
  const formAlarms = Valarms.fromList(editableAlarms)
  if (originalAlarms && currentUser) {
    return originalAlarms.mergeForPersonalSettingsUpdate(
      formAlarms,
      currentUser
    )
  }
  return formAlarms
}

function computeUpdatedFormValues(params: {
  formValues: EventFormValues
  mergedAlarms: Valarms
  originalEvent: CalendarEvent
  typeOfAction?: 'solo' | 'all'
}): EventFormValues {
  const { formValues, mergedAlarms, originalEvent, typeOfAction } = params
  if (typeOfAction !== 'all') {
    return {
      ...formValues,
      alarms: mergedAlarms
    }
  }

  const updateData = {
    ...formValues,
    start: formatLocalDateTime(
      moment.tz(originalEvent.start, originalEvent.timezone).toDate(),
      originalEvent.timezone
    ),
    alarms: mergedAlarms
  }

  if (originalEvent.end) {
    updateData.end = formatLocalDateTime(
      moment.tz(originalEvent.end, originalEvent.timezone).toDate(),
      originalEvent.timezone
    )
  }

  return updateData
}

const toggleShowMore = (s: boolean): boolean => !s

const EventSettingsUpdateModalInternal: React.FC<
  EventSettingsUpdateModalProps & { event: CalendarEvent }
> = props => {
  const { open, typeOfAction } = props
  const { t } = useI18n()
  const { isTooSmall: isMobile } = useScreenSizeDetection()

  const calList = useAppSelector(state => state.calendars.list)
  const userOrganizer = useAppSelector(state => state.user.organiserData)
  const currentUser = getCurrentUser(calList, props.calId)

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
    tempContext,
    masterEvent
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

  const editableAlarms = useMemo(() => {
    return currentUser
      ? formValues.alarms.getAllAlarmsForAttendee(currentUser)
      : []
  }, [formValues.alarms, currentUser])

  const handleSave = useCallback(async () => {
    const originalEvent = getOriginalEvent({
      typeOfAction,
      masterEvent,
      cachedEvent: calList[props.calId]?.events?.[props.eventId],
      fallbackEvent: props.event
    })
    const mergedAlarms = mergeUserAlarms(
      originalEvent.alarms,
      editableAlarms,
      currentUser
    )
    const valuesWithMergedAlarms = computeUpdatedFormValues({
      formValues,
      mergedAlarms,
      originalEvent,
      typeOfAction
    })

    await handleSubmit(valuesWithMergedAlarms)
  }, [
    handleSubmit,
    formValues,
    editableAlarms,
    calList,
    props.calId,
    props.eventId,
    props.event,
    currentUser,
    masterEvent,
    typeOfAction
  ])

  const actions = (
    <EventActions
      showExpandedBtn={false}
      isEdit
      onClose={handleClose}
      onSave={handleSave}
      onExpanded={() => setShowMore(toggleShowMore)}
    />
  )
  return (
    <ResponsiveDialog
      open={open}
      onClose={handleClose}
      title={t('eventPreview.editEventSpecificSettings')}
      draggable
      anchorEl={props.anchorEl}
      actions={actions}
      sx={dialogPaddingStyles(isMobile)}
    >
      <EventFormFieldPersonalSettings
        v={{
          ...formValues,
          alarms: Valarms.fromList(editableAlarms)
        }}
        typeOfAction={typeOfAction}
        setCalendarid={setCalendarid}
        userPersonalCalendars={userPersonalCalendars}
        showMore={showMore}
        setAlarms={setAlarms}
        setBusy={setBusy}
        setEventClass={setEventClass}
        isOrganizer={isOrganizer}
        user={currentUser as userAttendee}
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
