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
import { CALENDAR_VIEWS } from '../Calendar/utils/constants'

const EventPreviewModal: React.FC<{
  eventId: string
  calId: string
  tempEvent?: boolean
  open: boolean
  onClose: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void
  anchorEl?: HTMLElement | null
  currentView?: string
}> = ({ eventId, calId, tempEvent, open, onClose, anchorEl, currentView }) => {
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
    userPersonalCalendars,
    handleSettingsEditClick
  } = useEventPreviewState(eventId, calId, tempEvent, open, onClose)

  useEffect(
    () => {
      const isMissingEventOrCalendar = !event || !calendar
      if (open && isMissingEventOrCalendar) {
        onClose({}, 'backdropClick')
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, event, calendar]
  )

  if (!user || !event || !calendar) return null

  const isResourceAdmin = Boolean(
    user.openpaasId &&
    calendar.owner?.administrators?.some(admin => admin.id === user.openpaasId)
  )
  const isAdminOfResource = Boolean(calendar.owner?.resource && isResourceAdmin)

  const isAttendee = Boolean(
    event.attendee?.find(p => p.cal_address === user.email)
  )

  const isOwnAttendee = isAttendee && isOwn
  const hasActionsBorderTop = isOwnAttendee || isAdminOfResource

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

  const canModifyCalendar = isOwn || isWriteDelegated
  const hasMultipleAttendees = (event?.attendee?.length ?? 0) > 1

  return (
    <>
      <ResponsiveDialog
        open={open && !hidePreview}
        onClose={() => onClose({}, 'backdropClick')}
        showHeaderActions={false}
        draggable
        dynamicPositioning={currentView !== CALENDAR_VIEWS.listWeek}
        anchorEl={anchorEl}
        actionsBorderTop={hasActionsBorderTop}
        actionsJustifyContent="center"
        style={{ overflow: 'auto' }}
        contentSx={{ overflowX: 'hidden', overflowY: 'auto' }}
        titleSx={{ backgroundColor: '#FCFCFC' }}
        title=""
        headerRightAction={header}
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
          isTeamCalendar={calendar.owner?.teamCalendar}
          calendarName={calendar.name}
          ownerEmail={calendar.owner.emails?.[0]}
        />

        {/* Calendar label */}
        <CalendarSelectField
          calendarid={calendarid}
          setCalendarid={handleCalendarMove}
          userPersonalCalendars={
            !canModifyCalendar ? [calendar] : userPersonalCalendars
          }
          showMore={false}
          disabled={!canModifyCalendar}
        />
      </ResponsiveDialog>

      {/* Action menu (more vert) */}
      <EventPreviewActionMenu
        anchorEl={toggleActionMenu}
        isEditable={canModifyCalendar && hasMultipleAttendees}
        event={event}
        userEmail={user.email}
        onClose={() => setToggleActionMenu(null)}
        onDuplicate={handleDuplicateClick}
        onEdit={handleSettingsEditClick}
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
        anchorEl={anchorEl}
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
        anchorEl={anchorEl}
        currentView={currentView}
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
        anchorEl={anchorEl}
        currentView={currentView}
      />
    </>
  )
}

export default EventPreviewModal
