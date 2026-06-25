import {
  getCalendarDelegationAccess,
  getCalendarVisibility
} from '@common/components/Calendar/utils/calendarUtils'
import { CalDavLink } from '@common/features/Calendars/types/CalendarApiTypes'
import { CalendarData } from '@common/features/Calendars/types/CalendarData'

export function normalizeCalendar(rawCalendar: CalendarData, userId: string) {
  const description = rawCalendar['caldav:description']
  let delegated = false
  let source = rawCalendar['calendarserver:source']
    ? rawCalendar['calendarserver:source']._links.self?.href
    : rawCalendar._links.self?.href
  const link = rawCalendar._links.self?.href
  if (rawCalendar['calendarserver:delegatedsource']) {
    source = rawCalendar['calendarserver:delegatedsource']
    delegated = true
  }
  if (!source) {
    throw new Error('No source for calendar')
  }
  const id = CalDavLink.parseCalendarIdFromHref(source) ?? ''
  const ownerId = CalDavLink.getFirstIdFromHref(source) ?? ''
  const visibility = getCalendarVisibility(rawCalendar['acl'] ?? [])
  const access = getCalendarDelegationAccess(rawCalendar['acl'] ?? [], userId)

  return {
    cal: rawCalendar,
    description,
    delegated,
    source,
    link,
    id,
    ownerId,
    visibility,
    access
  }
}
