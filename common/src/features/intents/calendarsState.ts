import type { RootState } from '@common/app/store'
import { canWriteToCalendar } from '@common/features/Calendars/utils/calendarPermissions'
import { CALENDAR_HOME_NOT_FOUND_ERROR } from '@common/features/Calendars/services/getCalendarsListAsync'

/**
 * A calendar the form can save into, as the form chooses them (EventModal):
 * the user's own, or one delegated to them with the right to write. Used by
 * NewEventIntentPage.
 */
export function hasWritableCalendar(state: RootState): boolean {
  const userId = state.user.userData?.openpaasId ?? ''
  return Object.values(state.calendars.list).some(cal =>
    canWriteToCalendar(cal, userId)
  )
}

/**
 * The user or their calendars could not be loaded: an error of the server,
 * which the client is told (IntentPage), never a list without a calendar.
 * A calendar home the server does not have (a 404) is no failure: there is
 * no calendar to save into (NewEventIntentPage). A failed save writes the
 * error of the calendars too, with a calendar loaded: no failure either. The
 * callback of the sign-in keeps its failed loads in the user's error
 * (IntentsApp).
 */
export function hasLoadFailed(state: RootState): boolean {
  if (state.user.error) return true
  const { error } = state.calendars
  if (!error || error === CALENDAR_HOME_NOT_FOUND_ERROR) return false
  return !hasWritableCalendar(state)
}
