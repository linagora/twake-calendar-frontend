import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { assertThunkSuccess } from '@/utils/assertThunkSuccess'
import { getEffectiveEmail } from '@/utils/getEffectiveEmail'
import { isEventOrganiser } from '@/utils/isEventOrganiser'
import { browserDefaultTimeZone } from '@/utils/timezone'
import { useState } from 'react'
import { deleteEventAsync } from '../../Calendars/services'
import { ToUserData } from '../../User/type/OpenPaasUserData'
import { createEventContext } from '../createEventContext'
import { handleDelete } from '@/components/Event/eventHandlers/eventHandlers'
import { useEventUpdateModalReopen } from './useEventUpdateModalReopen'

export function useEventPreviewState(
  eventId: string,
  calId: string,
  tempEvent: boolean | undefined,
  open: boolean,
  onClose: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void
) {
  const dispatch = useAppDispatch()
  const calendars = useAppSelector(state => state.calendars)
  const timezone =
    useAppSelector(state => state.settings.timeZone) ?? browserDefaultTimeZone
  const user = useAppSelector(state => state.user.userData)

  const calendar = tempEvent ? calendars.templist[calId] : calendars.list[calId]
  const event = calendar?.events[eventId]

  // Modal visibility
  const [openUpdateModal, setOpenUpdateModal] = useState(false)
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false)
  const [hidePreview, setHidePreview] = useState(false)
  const [toggleActionMenu, setToggleActionMenu] = useState<Element | null>(null)
  const [updateModalCalId, setUpdateModalCalId] = useState(calId)

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
  const isOrganizer = event?.organizer
    ? isEventOrganiser(event, effectiveEmail)
    : isOwn
  const isNotPrivate =
    event?.class !== 'PRIVATE' && event?.class !== 'CONFIDENTIAL'

  const canEdit = isOrganizer && (isOwn || (isWriteDelegated && isNotPrivate))

  // If the user cannot edit here but has write access to the organizer's delegated
  // calendar, surface a shortcut so they don't have to hunt for the source event.
  const organizerEmail = event?.organizer?.cal_address?.toLowerCase()
  const organizerWritableCalendar: Calendar | undefined =
    !canEdit && organizerEmail
      ? Object.values(calendars.list).find(
          cal =>
            cal.delegated &&
            cal.access?.write &&
            cal.owner?.emails?.some(e => e.toLowerCase() === organizerEmail) &&
            cal.events[eventId] !== undefined
        )
      : undefined

  const contextualizedEvent =
    event && calendar && user ? createEventContext(event, calendar, user) : null

  const attendanceUser =
    isWriteDelegated && calendar?.owner ? ToUserData(calendar.owner) : user

  // Resolve typeOfAction for EventUpdateModal (state or sessionStorage fallback)
  const resolvedTypeOfAction = (() => {
    if (typeOfAction) return typeOfAction
    try {
      const stored = sessionStorage.getItem('eventUpdateModalReopen')
      if (stored) {
        const data = JSON.parse(stored)
        if (
          data.eventId === eventId &&
          data.calId === calId &&
          data.typeOfAction
        ) {
          return data.typeOfAction as 'solo' | 'all'
        }
      }
    } catch {
      // Ignore
    }
    return undefined
  })()

  // Action handlers
  const handleEditClick = () => {
    setUpdateModalCalId(calId)
    if (isRecurring) {
      setAfterChoiceFunc(() => () => {
        setHidePreview(true)
        setOpenUpdateModal(true)
      })
      setOpenEditModePopup('edit')
    } else {
      setHidePreview(true)
      setOpenUpdateModal(true)
    }
  }

  const handleEditInOrganizerCalendar = () => {
    if (!organizerWritableCalendar) return
    setUpdateModalCalId(organizerWritableCalendar.id)
    if (isRecurring) {
      setAfterChoiceFunc(() => () => {
        setHidePreview(true)
        setOpenUpdateModal(true)
      })
      setOpenEditModePopup('edit')
    } else {
      setHidePreview(true)
      setOpenUpdateModal(true)
    }
  }

  const handleDeleteClick = async () => {
    if (isRecurring) {
      setAfterChoiceFunc(
        () => (type?: 'solo' | 'all') =>
          handleDelete(
            isRecurring,
            type,
            onClose,
            dispatch,
            calendar,
            event,
            calId,
            eventId
          )
      )
      setOpenEditModePopup('delete')
    } else {
      onClose({}, 'backdropClick')
      try {
        const result = await dispatch(
          deleteEventAsync({ calId, eventId, eventURL: event.URL })
        )
        await assertThunkSuccess(result)
      } catch (error) {
        console.error('Failed to delete event:', error)
      }
    }
  }

  const handleDuplicateClick = () => {
    setHidePreview(true)
    setOpenDuplicateModal(true)
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
    organizerWritableCalendar,

    // Modal state
    openUpdateModal,
    setOpenUpdateModal,
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
    handleDeleteClick,
    handleDuplicateClick,

    dispatch
  }
}
