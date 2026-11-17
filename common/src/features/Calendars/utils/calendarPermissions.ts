import {
  AccessRight,
  Calendar,
  WRITE_ACCESS_LEVELS
} from '@common/types/CalendarTypes'
import { normalizeEmail } from '@common/utils/normalizeEmail'

const ADMIN_ACCESS: AccessRight = 5

export function canWriteToCalendar(cal: Calendar, userId: string): boolean {
  if (!cal) return false

  const isOwner = cal.id?.split('/')[0] === userId
  const hasDelegatedWrite = !!(cal.delegated && cal.access?.write)

  return isOwner || hasDelegatedWrite
}

function isResourceCalendar(cal: Calendar): boolean {
  return !!cal.owner?.resource
}

/**
 * Whether the user's events may be stored in a calendar: one they may write
 * into, but no resource calendar. A resource is booked by inviting it from the
 * Resource field of the form, never by storing the event in its calendar,
 * even for the administrators of the resource who see that calendar as
 * writable.
 */
export function canHoldUserEvents(cal: Calendar, userId: string): boolean {
  if (!cal) return false
  return canWriteToCalendar(cal, userId) && !isResourceCalendar(cal)
}

/**
 * The calendars to offer as the calendar of an existing event: no resource
 * calendar, but the one the event already is in, so that it stays displayed
 * and selected.
 */
export function withoutOtherResourceCalendars(
  calendars: Calendar[],
  currentCalendarId: string | undefined
): Calendar[] {
  return calendars.filter(
    cal => !isResourceCalendar(cal) || cal.id === currentCalendarId
  )
}

function isInvitedWith(
  cal: Calendar,
  userEmail: string | undefined,
  accesses: number[]
): boolean {
  const email = normalizeEmail(userEmail)
  if (!email) return false
  return !!cal.invite?.some(
    invite =>
      accesses.includes(invite.access) &&
      normalizeEmail(invite.href.replace(/^mailto:/i, '')) === email
  )
}

/**
 * Whether the user manages who may use a calendar -- its rights and its public
 * visibility: its owner, or anybody it was lent to with the administration
 * right, be it a user's calendar, a team calendar or a resource.
 */
export function canAdministerCalendar(
  cal: Calendar,
  user: { openpaasId?: string; email?: string }
): boolean {
  if (!cal) return false
  if (user.openpaasId && cal.id?.split('/')[0] === user.openpaasId) return true

  return isInvitedWith(cal, user.email, [ADMIN_ACCESS])
}

/**
 * Whether a member of a team calendar may change its events: every member
 * sees them, but only those granted the read-write or the administration
 * right may write them back.
 */
export function canWriteToTeamCalendar(
  cal: Calendar,
  userEmail: string | undefined
): boolean {
  if (!cal) return false
  return isInvitedWith(cal, userEmail, WRITE_ACCESS_LEVELS)
}
