import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { AppDispatch } from '@common/app/store'
import { setCalendarError } from '@common/features/Calendars/CalendarSlice'
import { useUndoableAction } from '@common/components/UndoableActions/UndoableActionsProvider'
import { createEventContext } from '@common/features/Events/createEventContext'
import {
  commitEventDeletion,
  scheduleEventDeletion,
  undoEventDeletion
} from '@common/features/Events/eventDeletion'
import { canWriteToTeamCalendar } from '@common/features/Calendars/utils/calendarPermissions'
import { moveEventBetweenCalendars } from '@common/features/Events/updateEventHelpers/moveEventBetweenCalendars'
import { ToUserData } from '@common/features/User/type/OpenPaasUserData'
import { userData, userOrganiser } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent, ContextualizedEvent } from '@common/types/EventsTypes'
import { getEffectiveEmail } from '@common/utils/getEffectiveEmail'
import { isEventOrganiser } from '@common/utils/isEventOrganiser'
import { normalizeIdentity } from '@common/utils/normalizeIdentity'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { useMemo, useState } from 'react'
import { useI18n } from 'twake-i18n'
import { useEventUpdateModalReopen } from './useEventUpdateModalReopen'

const isMaskedClassification = (classification?: string): boolean =>
  classification === 'PRIVATE' || classification === 'CONFIDENTIAL'

interface StoredEventReopenData {
  eventId: string
  calId: string
  typeOfAction?: 'solo' | 'all'
}

interface UseEventPreviewStateReturn {
  event: CalendarEvent
  calendar: Calendar | undefined
  user: userData
  timezone: string
  contextualizedEvent: ContextualizedEvent | null
  attendanceUser: userData | undefined
  isRecurring: boolean
  isOwn: boolean
  isWriteDelegated: boolean
  isOrganizer: boolean
  isNotPrivate: boolean
  canEdit: boolean
  canModify: boolean
  canMove: boolean
  organizerWritableCalendar: Calendar | undefined
  openUpdateModal: boolean
  openSettingsUpdateModal: boolean
  setOpenUpdateModal: React.Dispatch<React.SetStateAction<boolean>>
  setOpenSettingsUpdateModal: React.Dispatch<React.SetStateAction<boolean>>
  openDuplicateModal: boolean
  setOpenDuplicateModal: React.Dispatch<React.SetStateAction<boolean>>
  hidePreview: boolean
  setHidePreview: React.Dispatch<React.SetStateAction<boolean>>
  toggleActionMenu: Element | null
  setToggleActionMenu: React.Dispatch<React.SetStateAction<Element | null>>
  updateModalCalId: string
  openEditModePopup: string | null
  setOpenEditModePopup: React.Dispatch<React.SetStateAction<string | null>>
  typeOfAction: 'solo' | 'all' | undefined
  setTypeOfAction: React.Dispatch<
    React.SetStateAction<'solo' | 'all' | undefined>
  >
  afterChoiceFunc: ((type: 'solo' | 'all' | undefined) => void) | undefined
  setAfterChoiceFunc: React.Dispatch<
    React.SetStateAction<
      ((type: 'solo' | 'all' | undefined) => void) | undefined
    >
  >
  resolvedTypeOfAction: 'solo' | 'all' | undefined
  handleEditClick: () => void
  handleEditInOrganizerCalendar: () => void
  handleSettingsEditClick: () => void
  handleDeleteClick: () => void
  handleDuplicateClick: () => void
  calendarid: string
  handleCalendarMove: (calendarid: string) => void
  userPersonalCalendars: Calendar[]
  dispatch: AppDispatch
}

export function useEventPreviewState(
  eventId: string,
  calId: string,
  tempEvent: boolean | undefined,
  open: boolean,
  onClose: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void
): UseEventPreviewStateReturn {
  const dispatch = useAppDispatch()
  const { t } = useI18n()
  const scheduleUndoableAction = useUndoableAction()
  const calendars = useAppSelector(state => state.calendars) as {
    list: Record<string, Calendar>
    templist: Record<string, Calendar>
  }

  const timezone =
    useAppSelector(state => state.settings.timeZone) ?? browserDefaultTimeZone
  const user = useAppSelector(state => state.user.userData)

  const calendar = tempEvent ? calendars.templist[calId] : calendars.list[calId]
  const event = calendar?.events[eventId]

  const [calendarid, setCalendarid] = useState<string>(calendar?.id ?? '')

  const currentUserOrganizer = useMemo(
    () =>
      new userOrganiser({
        cal_address: `mailto:${user?.email ?? ''}`,
        cn: user.name || user?.email || ''
      }),
    [user]
  )

  // Modal visibility
  const [openUpdateModal, setOpenUpdateModal] = useState<boolean>(false)
  const [openSettingsUpdateModal, setOpenSettingsUpdateModal] =
    useState<boolean>(false)
  const [openDuplicateModal, setOpenDuplicateModal] = useState<boolean>(false)
  const [hidePreview, setHidePreview] = useState<boolean>(false)
  const [toggleActionMenu, setToggleActionMenu] = useState<Element | null>(null)
  const [updateModalCalId, setUpdateModalCalId] = useState<string>(calId)

  // Recurring event handling
  const [openEditModePopup, setOpenEditModePopup] = useState<string | null>(
    null
  )
  const [typeOfAction, setTypeOfAction] = useState<'solo' | 'all' | undefined>(
    undefined
  )
  const [afterChoiceFunc, setAfterChoiceFunc] = useState<
    ((type: 'solo' | 'all' | undefined) => void) | undefined
  >()

  // Reopen logic (sessionStorage + custom event)
  useEventUpdateModalReopen({
    open,
    eventId,
    calId,
    typeOfAction,
    setTypeOfAction,
    setOpenUpdateModal,
    setHidePreview
  })

  // Derived access flags
  const isRecurring = event?.uid?.includes('/') ?? false
  const isOwn = calendar?.owner?.emails?.includes(user?.email ?? '') ?? false
  const isDelegated = calendar?.delegated
  const isWriteDelegated = (isDelegated && calendar?.access?.write) ?? false
  const effectiveEmail = user
    ? getEffectiveEmail(calendar, isWriteDelegated, user.email)
    : ''
  // without an organizer, whoever may write the calendar organizes, as its owner does
  const isOrganizer = event?.organizer
    ? isEventOrganiser(event, effectiveEmail, calendar)
    : isOwn || isWriteDelegated
  const isNotPrivate = !isMaskedClassification(event?.class)
  const isTeamCalendar = Boolean(calendar?.owner?.teamCalendar)

  // Every member of a team calendar counts among its owners, but only those
  // granted the read-write or the administration right may change its events.
  const canWriteOwn =
    isOwn &&
    (!isTeamCalendar ||
      (!!calendar && canWriteToTeamCalendar(calendar, user?.email)))

  // Private events of a delegated calendar are served masked ("Busy", details
  // stripped): writing them back would overwrite the owner's real content.
  const canModify = canWriteOwn || (isWriteDelegated && isNotPrivate)
  const canEdit = isOrganizer && canModify

  // If the user cannot edit here but has write access to the organizer's delegated
  // calendar, surface a shortcut so they don't have to hunt for the source event.
  const organizerEmail = event?.organizer?.cal_address?.toLowerCase()
  const organizerWritableCalendar: Calendar | undefined =
    !canEdit && organizerEmail
      ? Object.values(calendars.list).find(
          (cal): boolean | undefined =>
            cal.delegated &&
            cal.access?.write &&
            cal.owner?.emails?.some(e => e.toLowerCase() === organizerEmail) &&
            cal.events[eventId] !== undefined &&
            !isMaskedClassification(cal.events[eventId].class)
        )
      : undefined

  const contextualizedEvent =
    event && calendar && user ? createEventContext(event, calendar, user) : null

  const attendanceUser =
    isWriteDelegated && calendar?.owner && !isTeamCalendar
      ? ToUserData(calendar.owner)
      : user

  // Resolve typeOfAction for EventUpdateModal (state or sessionStorage fallback)
  const resolvedTypeOfAction = ((): 'solo' | 'all' | undefined => {
    if (typeOfAction) return typeOfAction
    try {
      const stored = sessionStorage.getItem('eventUpdateModalReopen')
      if (stored) {
        const data = JSON.parse(stored) as StoredEventReopenData
        if (
          data &&
          data.eventId === eventId &&
          data.calId === calId &&
          data.typeOfAction
        ) {
          return data.typeOfAction
        }
      }
    } catch {
      // Ignore
    }
    return undefined
  })()

  const userPersonalCalendars: Calendar[] = Object.values(
    calendars.list || {}
  ).filter(
    (cal): boolean | undefined =>
      cal.id?.split('/')[0] === user.openpaasId ||
      (cal.delegated &&
        cal.access?.write &&
        isEventOrganiser(event, effectiveEmail, cal))
  )

  // Moving re-creates the event in the target and deletes it from the source:
  // only offer it from a calendar the user could pick as a destination. This
  // keeps bookings organized by someone else in a resource calendar (or any
  // delegated calendar) where they are.
  const canMove =
    canModify && userPersonalCalendars.some(cal => cal.id === calId)

  // Action handlers
  const handleEditClick = (): void => {
    setUpdateModalCalId(calId)
    if (isRecurring) {
      setAfterChoiceFunc(() => (): void => {
        setHidePreview(true)
        setOpenUpdateModal(true)
      })
      setOpenEditModePopup('edit')
    } else {
      setHidePreview(true)
      setOpenUpdateModal(true)
    }
  }

  const handleEditInOrganizerCalendar = (): void => {
    if (!organizerWritableCalendar) return
    setUpdateModalCalId(organizerWritableCalendar.id)
    if (isRecurring) {
      setAfterChoiceFunc(() => (): void => {
        setHidePreview(true)
        setOpenUpdateModal(true)
      })
      setOpenEditModePopup('edit')
    } else {
      setHidePreview(true)
      setOpenUpdateModal(true)
    }
  }

  const handleSettingsEditClick = (): void => {
    setUpdateModalCalId(calId)
    if (isRecurring) {
      setAfterChoiceFunc(() => (): void => {
        setHidePreview(true)
        setOpenSettingsUpdateModal(true)
      })
      setOpenEditModePopup('edit')
    } else {
      setHidePreview(true)
      setOpenSettingsUpdateModal(true)
    }
  }

  const deleteWithUndo = (scope: 'solo' | 'all'): void => {
    onClose({}, 'backdropClick')
    const organizer = normalizeIdentity(event.organizer?.cal_address ?? '')
    const guestsNotified =
      isOrganizer &&
      (event.attendee ?? []).some(
        attendee =>
          attendee.cutype !== 'RESOURCE' &&
          normalizeIdentity(attendee.cal_address) !== organizer
      )
    const deletionId = dispatch(scheduleEventDeletion({ calId, event, scope }))
    scheduleUndoableAction({
      message: t(
        guestsNotified ? 'event.deletedGuestsNotified' : 'event.deleted',
        { title: event.title || t('event.untitled') }
      ),
      commit: () => dispatch(commitEventDeletion(deletionId)),
      undo: () => dispatch(undoEventDeletion(deletionId))
    })
  }

  const handleDeleteClick = (): void => {
    if (isRecurring) {
      setAfterChoiceFunc(
        () =>
          (type?: 'solo' | 'all'): void =>
            deleteWithUndo(type === 'solo' ? 'solo' : 'all')
      )
      setOpenEditModePopup('delete')
    } else {
      deleteWithUndo('all')
    }
  }

  const handleDuplicateClick = (): void => {
    setHidePreview(true)
    setOpenDuplicateModal(true)
  }

  const handleCalendarMove = (targetCalId: string): void => {
    if (!event || !canMove || targetCalId === calId) return
    const targetCalendar = calendars.list[targetCalId]
    const isTargetTeamCalendar = Boolean(targetCalendar?.owner?.teamCalendar)
    const movePayload = isTargetTeamCalendar
      ? { ...event, organizer: currentUserOrganizer }
      : event

    void Promise.resolve(
      moveEventBetweenCalendars({
        dispatch,
        calList: calendars.list,
        newEvent: movePayload,
        oldCalId: calId,
        newCalId: targetCalId
      })
    )
      .then(() => setCalendarid(targetCalId))
      .catch(error => {
        console.error('Failed to move event:', error)
        dispatch(setCalendarError(`Failed to move event: ${error}`))
        setCalendarid(calId)
      })
  }

  return {
    // Data
    event,
    calendar,
    user,
    timezone,
    contextualizedEvent,
    attendanceUser,

    // Access flags
    isRecurring,
    isOwn,
    isWriteDelegated,
    isOrganizer,
    isNotPrivate,
    canEdit,
    canModify,
    canMove,
    organizerWritableCalendar,

    // Modal state
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

    // Recurring state
    openEditModePopup,
    setOpenEditModePopup,
    typeOfAction,
    setTypeOfAction,
    afterChoiceFunc,
    setAfterChoiceFunc,
    resolvedTypeOfAction,

    // Handlers
    handleEditClick,
    handleEditInOrganizerCalendar,
    handleSettingsEditClick,
    handleDeleteClick,
    handleDuplicateClick,

    // moving calendar
    calendarid,
    handleCalendarMove,
    userPersonalCalendars,

    dispatch
  }
}
