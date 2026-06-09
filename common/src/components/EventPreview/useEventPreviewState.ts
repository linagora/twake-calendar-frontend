import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { AppDispatch } from '@common/app/store'
import { handleDelete } from '@common/components/Event/eventHandlers/eventHandlers'
import {
  deleteEvent,
  setCalendarError
} from '@common/features/Calendars/CalendarSlice'
import { createEventContext } from '@common/features/Events/createEventContext'
import { moveEventBetweenCalendars } from '@common/features/Events/updateEventHelpers/moveEventBetweenCalendars'
import { ToUserData } from '@common/features/User/type/OpenPaasUserData'
import { userData } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { CalendarEvent, ContextualizedEvent } from '@common/types/EventsTypes'
import { assertThunkSuccess } from '@common/utils/assertThunkSuccess'
import { getEffectiveEmail } from '@common/utils/getEffectiveEmail'
import { isEventOrganiser } from '@common/utils/isEventOrganiser'
import { browserDefaultTimeZone } from '@common/utils/timezone'
import { useState } from 'react'
import { useEventUpdateModalReopen } from './useEventUpdateModalReopen'

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
  handleDeleteClick: () => Promise<void>
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
          (cal): boolean | undefined =>
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
        isEventOrganiser(event, effectiveEmail))
  )

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

  const handleDeleteClick = async (): Promise<void> => {
    if (isRecurring) {
      setAfterChoiceFunc(
        () =>
          (type?: 'solo' | 'all'): void =>
            void handleDelete(
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
          deleteEvent({ calId, eventId, eventURL: event.URL })
        )
        await assertThunkSuccess(result)
      } catch (error) {
        console.error('Failed to delete event:', error)
      }
    }
  }

  const handleDuplicateClick = (): void => {
    setHidePreview(true)
    setOpenDuplicateModal(true)
  }

  const handleCalendarMove = (calendarid: string): void => {
    if (!event || calendarid === calId) return
    void Promise.resolve(
      moveEventBetweenCalendars({
        dispatch,
        calList: calendars.list,
        newEvent: event,
        oldCalId: calId,
        newCalId: calendarid
      })
    )
      .then(() => setCalendarid(calendarid))
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
    handleDeleteClick,
    handleDuplicateClick,

    // moving calendar
    calendarid,
    handleCalendarMove,
    userPersonalCalendars,

    dispatch
  }
}
