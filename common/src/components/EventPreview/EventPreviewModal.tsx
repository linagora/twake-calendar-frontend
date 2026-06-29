import ResponsiveDialog from '@common/components/Dialog/ResponsiveDialog'
import { EditModeDialog } from '@common/components/Event/EditModeDialog'
import { CalendarSelectField } from '@common/components/Event/fields/CalendarSelectField'
import { EventPreviewActionMenu } from '@common/components/EventPreview/EventPreviewActionMenu'
import { EventPreviewDetails } from '@common/components/EventPreview/EventPreviewDetails'
import { EventPreviewHeader } from '@common/components/EventPreview/EventPreviewHeader'
import { useEventPreviewState } from '@common/components/EventPreview/useEventPreviewState'
import { AttendanceValidation } from '@common/features/Events/AttendanceValidation/AttendanceValidation'
import EventPopover from '@common/features/Events/EventModal'
import EventSettingsUpdateModal from '@common/features/Events/EventSettingsUpdateModal'
import EventUpdateModal from '@common/features/Events/EventUpdateModal'
import { DateSelectArg } from '@fullcalendar/core'
import { useEffect } from 'react'
import { useI18n } from 'twake-i18n'
import { EventPreviewTitleRow } from './EventPreviewTitleRow'

const EventPreviewModal: React.FC<{
  eventId: string
  calId: string
  tempEvent?: boolean
  open: boolean
  onClose: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void
}> = ({ eventId, calId, tempEvent, open, onClose }) => {
  const { t } = useI18n()

  const {
    event,
    calendar,
    user,
    timezone,
    contextualizedEvent,
    attendanceUser,
    isOwn,
    isWriteDelegated,
    isOrganizer,
    isNotPrivate,
    canEdit,
    organizerWritableCalendar,
    openUpdateModal,
    openSettingsUpdateModal,
    setOpenUpdateModal,
    setOpenSettingsUpdateModal,
    openDuplicateModal,
    setOpenDuplicateModal,
    hidePreview,
    setHidePreview,
    toggleActionMenu,
    setToggleActionMenu,
    updateModalCalId,
    openEditModePopup,
    setOpenEditModePopup,
    setTypeOfAction,
    afterChoiceFunc,
    setAfterChoiceFunc,
    resolvedTypeOfAction,
    handleEditClick,
    handleEditInOrganizerCalendar,
    handleDeleteClick,
    handleDuplicateClick,
    calendarid,
    handleCalendarMove,
    userPersonalCalendars
  } = useEventPreviewState(eventId, calId, tempEvent, open, onClose)

  useEffect(
    () => {
      if (open && (!event || !calendar)) {
        onClose({}, 'backdropClick')
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, event, calendar]
  )

  if (!user || !event || !calendar) return null

  const isAdminOfResource = Boolean(
    calendar.owner?.resource &&
    user.openpaasId &&
    calendar.owner?.administrators?.some(admin => admin.id === user.openpaasId)
  )

  const isAttendee = Boolean(
    event.attendee?.find(p => p.cal_address === user.email)
  )

  const hasActionsBorderTop = (isAttendee && isOwn) || isAdminOfResource

  const editInOrganizerCalendarTooltip = organizerWritableCalendar
    ? t('eventPreview.editInOrganizerCalendar', {
        calendarName: organizerWritableCalendar.name
      })
    : undefined

  const header = (
    <EventPreviewHeader
      event={event}
      eventId={eventId}
      isOrganizer={isOrganizer}
      isOwn={isOwn}
      isWriteDelegated={isWriteDelegated}
      isNotPrivate={isNotPrivate}
      canEdit={canEdit}
      onDelete={() => void handleDeleteClick()}
      onClose={() => onClose({}, 'backdropClick')}
      onEdit={handleEditClick}
      onMoreClick={e => setToggleActionMenu(e.currentTarget)}
      onEditInOrganizerCalendar={
        organizerWritableCalendar ? handleEditInOrganizerCalendar : undefined
      }
      editInOrganizerCalendarTooltip={editInOrganizerCalendarTooltip}
    />
  )

  const actions = contextualizedEvent && (
    <AttendanceValidation
      contextualizedEvent={contextualizedEvent}
      user={attendanceUser}
      setAfterChoiceFunc={setAfterChoiceFunc}
      setOpenEditModePopup={setOpenEditModePopup}
    />
  )

  return (
    <>
      <ResponsiveDialog
        open={open && !hidePreview}
        onClose={() => onClose({}, 'backdropClick')}
        showHeaderActions={false}
        actionsBorderTop={hasActionsBorderTop}
        actionsJustifyContent="center"
        style={{ overflow: 'auto' }}
        titleSx={{ backgroundColor: '#FCFCFC' }}
        title={header}
        actions={actions}
      >
        {/* Title & date row */}
        <EventPreviewTitleRow
          event={event}
          isOwn={isOwn}
          timezone={timezone}
          t={t}
        />

        {/* Event details (attendees, location, description, etc.) */}
        <EventPreviewDetails
          event={event}
          isOwn={isOwn}
          isNotPrivate={isNotPrivate}
          isResourceEventPreview={calendar.owner?.resource}
          calendarName={calendar.name}
          ownerEmail={calendar.owner.emails?.[0]}
        />

        {/* Calendar label */}
        <CalendarSelectField
          calendarid={calendarid}
          setCalendarid={handleCalendarMove}
          userPersonalCalendars={
            !isOwn && !isWriteDelegated ? [calendar] : userPersonalCalendars
          }
          showMore={false}
          disabled={!isOwn && !isWriteDelegated}
        />
      </ResponsiveDialog>

      {/* Action menu (more vert) */}
      <EventPreviewActionMenu
        anchorEl={toggleActionMenu}
        isEditable={
          (isOwn || isWriteDelegated) && (event?.attendee?.length ?? 0) > 1
        }
        event={event}
        userEmail={user.email}
        onClose={() => setToggleActionMenu(null)}
        onDuplicate={handleDuplicateClick}
        onEdit={() => {
          setOpenSettingsUpdateModal(true)
        }}
      />

      {/* Recurring edit/delete mode picker */}
      <EditModeDialog
        type={openEditModePopup}
        setOpen={setOpenEditModePopup}
        eventAction={(type: 'solo' | 'all' | undefined) => {
          setTypeOfAction(type)
          afterChoiceFunc?.(type)
        }}
      />

      {/* personal settings modal */}
      <EventSettingsUpdateModal
        open={openSettingsUpdateModal}
        onClose={() => {
          setOpenSettingsUpdateModal(false)
          setHidePreview(false)
        }}
        onCloseAll={() => {
          setOpenSettingsUpdateModal(false)
          onClose({}, 'backdropClick')
        }}
        eventId={eventId}
        calId={updateModalCalId}
        typeOfAction={resolvedTypeOfAction}
      />

      {/* Edit modal */}
      <EventUpdateModal
        open={openUpdateModal}
        onClose={() => {
          setOpenUpdateModal(false)
          setHidePreview(false)
        }}
        onCloseAll={() => {
          setOpenUpdateModal(false)
          onClose({}, 'backdropClick')
        }}
        eventId={eventId}
        calId={updateModalCalId}
        typeOfAction={resolvedTypeOfAction}
      />

      {/* Duplicate modal */}
      <EventPopover
        open={openDuplicateModal}
        selectedRange={
          {
            start: new Date(event.start),
            startStr: event.start,
            end: new Date(event.end ?? event.start),
            endStr: event.end ?? event.start,
            allDay: event.allday ?? false
          } as DateSelectArg
        }
        setSelectedRange={() => {}}
        calendarRef={{ current: null }}
        onClose={() => {
          setOpenDuplicateModal(false)
          onClose({}, 'backdropClick')
        }}
        event={event}
      />
    </>
  )
}

export default EventPreviewModal
