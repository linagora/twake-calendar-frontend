import { CalendarEvent, ContextualizedEvent } from '@common/types/EventsTypes'
import { userData } from '@common/features/User/userDataTypes'
import { Calendar } from '@common/types/CalendarTypes'
import { OpenPaasUserData } from '@common/features/User/type/OpenPaasUserData'

interface UseAttendanceValidationAuthorizationResult {
  isAuthorized: boolean
}

function isTeamCalendar(calendar: Calendar): boolean {
  return Boolean(calendar.owner?.teamCalendar)
}

// The owner of a calendar shared with write right may be answered for: the
// delegate answers on their behalf. A read-only delegate cannot answer, and
// the answer shown would be the owner's, not theirs.
function checkIsWriteDelegatedPublicEvent(
  calendar: Calendar,
  event: CalendarEvent
): boolean {
  if (!calendar.delegated || isTeamCalendar(calendar)) return false
  if (!calendar.access?.write) return false
  return !event.class || event.class === 'PUBLIC'
}

// Every member of a team calendar counts among its owners: only those invited
// to the event have an answer to give.
function checkIsOwnCalendarAnswer(
  contextualizedEvent: ContextualizedEvent
): boolean {
  const { currentUserAttendee, isOwn, calendar } = contextualizedEvent
  if (!isOwn) return false
  return !isTeamCalendar(calendar) || !!currentUserAttendee
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
  const { calendar, event } = contextualizedEvent

  const isAuthorized =
    checkIsOwnCalendarAnswer(contextualizedEvent) ||
    checkIsWriteDelegatedPublicEvent(calendar, event) ||
    checkIsAdminOfResource(calendar.owner, user?.openpaasId)

  return { isAuthorized }
}
