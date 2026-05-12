import { CalendarEvent, ContextualizedEvent } from '../EventsTypes'
import { userData } from '@/features/User/userDataTypes'
import { Calendar } from '@/features/Calendars/CalendarTypes'
import { OpenPaasUserData } from '@/features/User/type/OpenPaasUserData'

interface UseAttendanceValidationAuthorizationResult {
  isAuthorized: boolean
}

function checkHasNoAttendeesOrOrganizer(event: CalendarEvent): boolean {
  return !(event.attendee?.length > 0) && !event.organizer
}

function checkIsDelegatedPublicEvent(
  calendar: Calendar,
  event: CalendarEvent
): boolean {
  if (!calendar.delegated) return false
  return !event.class || event.class === 'PUBLIC'
}

function checkIsAdminOfResource(
  owner: OpenPaasUserData | undefined,
  userId: string | undefined
): boolean {
  if (!owner?.resource || !userId) return false
  return !!owner.administrators?.some(admin => admin.id === userId)
}

export function useAttendanceValidationAuthorization(
  contextualizedEvent: ContextualizedEvent,
  user: userData | undefined
): UseAttendanceValidationAuthorizationResult {
  const { currentUserAttendee, isOwn, calendar, event } = contextualizedEvent
  const openpaasId = user?.openpaasId

  const noAttendeesOrOrganizer = checkHasNoAttendeesOrOrganizer(event)
  const createByTheUser = !!(currentUserAttendee || noAttendeesOrOrganizer)

  const isAuthorized =
    (createByTheUser && isOwn) ||
    isOwn ||
    checkIsDelegatedPublicEvent(calendar, event) ||
    checkIsAdminOfResource(calendar.owner, openpaasId)

  return { isAuthorized }
}
